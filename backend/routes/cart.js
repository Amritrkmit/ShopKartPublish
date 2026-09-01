const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middlewares/userJWT");

// 1. Get Cart Items
router.get("/", authMiddleware, async (req, res) => {
    const query = `
    SELECT 
        c.id, c.quantity, c.product_id, c.size, c.selected_options, c.customization_details,
        p.name, p.price, p.sale_price, p.image, p.slug, p.is_customizable, p.customization_fields, p.shop_id,
        sh.name AS shop_name, sh.slug AS shop_slug,
        gb.discount_percentage as gb_discount_percentage,
        gb.id as group_buy_id,
        gb.status as gb_status
    FROM cart_items c
    JOIN products p ON c.product_id = p.id
    LEFT JOIN shops sh ON p.shop_id = sh.id
    LEFT JOIN group_buy_participants gbp ON c.product_id = (SELECT product_id FROM group_buys WHERE id = gbp.group_buy_id) AND gbp.user_id = ?
    LEFT JOIN group_buys gb ON gbp.group_buy_id = gb.id AND gb.status = 'completed'
    WHERE c.user_id = ?
  `;
    try {
        const [results] = await db.promise.query(query, [req.user.id, req.user.id]);

        // Map results to include calculated discount
        const cartWithDiscounts = results.map(item => {
            let effectivePrice = item.sale_price;
            let groupBuyDiscount = 0;

            if (item.gb_status === 'completed' && item.gb_discount_percentage) {
                // Calculate discount based on Sale Price as per user request
                groupBuyDiscount = Math.round((item.sale_price * item.gb_discount_percentage) / 100);
                effectivePrice = item.sale_price - groupBuyDiscount;
            }

            return {
                ...item,
                groupBuyDiscount,
                effectivePrice
            };
        });

        res.json({ cart: cartWithDiscounts });
    } catch (err) {
        console.error("Cart fetch error:", err);
        res.status(500).json({ message: "DB Error" });
    }
});

// 2. Add to Cart
router.post("/add", authMiddleware, (req, res) => {
    const { product_id, quantity, size, selected_options, customization_details } = req.body;
    const qty = quantity || 1;
    const itemSize = size || null;
    const options = selected_options ? JSON.stringify(selected_options) : null;
    const customization = customization_details ? JSON.stringify(customization_details) : null;

    if (!product_id) return res.status(400).json({ message: "Product ID required" });

    // Check if exists (Same Product AND Same Size AND Same Options)
    // Note: JSON comparison in SQL is tricky. We'll attempt exact string match for now.
    // If that fails, we might get duplicate rows which is acceptable for cart.
    const checkSql = "SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND (size = ? OR (size IS NULL AND ? IS NULL)) AND (selected_options = ? OR (selected_options IS NULL AND ? IS NULL)) AND (customization_details = ? OR (customization_details IS NULL AND ? IS NULL))";

    db.query(checkSql, [req.user.id, product_id, itemSize, itemSize, options, options, customization, customization], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "DB Error" });
        }

        if (results.length > 0) {
            // Update quantity
            const newQty = results[0].quantity + qty;
            db.query("UPDATE cart_items SET quantity = ? WHERE id = ?", [newQty, results[0].id], (err) => {
                if (err) return res.status(500).json({ message: "DB Error" });
                res.json({ message: "Cart updated" });
            });
        } else {
            // Insert new
            db.query(
                "INSERT INTO cart_items (user_id, product_id, quantity, size, selected_options, customization_details) VALUES (?, ?, ?, ?, ?, ?)",
                [req.user.id, product_id, qty, itemSize, options, customization],
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: "DB Error" });
                    }
                    res.json({ message: "Added to cart" });
                }
            );
        }
    });
});

// 3. Update Quantity
router.put("/:id", authMiddleware, (req, res) => {
    const { quantity } = req.body;
    if (quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

    db.query(
        "UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?",
        [quantity, req.params.id, req.user.id],
        (err) => {
            if (err) return res.status(500).json({ message: "DB Error" });
            res.json({ message: "Quantity updated" });
        }
    );
});

// 4. Remove Item
router.delete("/:id", authMiddleware, (req, res) => {
    db.query(
        "DELETE FROM cart_items WHERE id = ? AND user_id = ?",
        [req.params.id, req.user.id],
        (err) => {
            if (err) return res.status(500).json({ message: "DB Error" });
            res.json({ message: "Item removed" });
        }
    );
});

// 5. Share Cart (Public - works for both guests and logged-in users)
router.post("/share", async (req, res) => {
    try {
        let userId = null;
        let items = [];

        // 1. Try to get user from token if provided
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const jwt = require("jsonwebtoken");
            const token = authHeader.split(" ")[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded.id;
            } catch (e) { /* invalid token, treat as guest */ }
        }

        // 2. Resolve items
        if (userId) {
            // Logged in: Fetch from DB
            const [dbItems] = await db.promise.query(
                "SELECT product_id, quantity, size, selected_options FROM cart_items WHERE user_id = ?",
                [userId]
            );
            items = dbItems;
        } else {
            // Guest: Expect items in body
            items = req.body.items || [];
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Cannot share an empty cart" });
        }

        // Generate a random token
        const crypto = require('crypto');
        const token = crypto.randomBytes(16).toString('hex');

        // Store snapshot
        await db.promise.query(
            "INSERT INTO shared_carts (share_token, user_id, items) VALUES (?, ?, ?)",
            [token, userId, JSON.stringify(items)]
        );

        res.json({ token, shareUrl: `${req.get('origin')}/shared-cart/${token}` });
    } catch (err) {
        console.error("Cart share error:", err);
        res.status(500).json({ message: "Failed to share cart" });
    }
});

// 6. Get Shared Cart
router.get("/shared/:token", async (req, res) => {
    try {
        const { token } = req.params;
        const [rows] = await db.promise.query(
            `
            SELECT sc.items, sc.created_at, u.name as owner_name 
            FROM shared_carts sc
            LEFT JOIN users u ON sc.user_id = u.id
            WHERE sc.share_token = ?
            `,
            [token]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Shared cart not found or expired" });
        }

        const sharedCart = rows[0];
        const items = typeof sharedCart.items === 'string' ? JSON.parse(sharedCart.items) : sharedCart.items;

        // Fetch product details for the shared items
        const productDetails = await Promise.all(items.map(async (item) => {
            const [p] = await db.promise.query(
                "SELECT name, price, sale_price, image, slug FROM products WHERE id = ?",
                [item.product_id]
            );
            return { ...item, ...p[0] };
        }));

        res.json({
            owner: sharedCart.owner_name,
            created_at: sharedCart.created_at,
            items: productDetails
        });
    } catch (err) {
        console.error("Fetch shared cart error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
