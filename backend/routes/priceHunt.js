const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middlewares/userJWT");
const crypto = require("crypto");

// Get active hunts
router.get("/active", async (req, res) => {
    try {
        const [rows] = await db.promise.query(
            "SELECT id, name, slug, image FROM products WHERE is_hunt_target = TRUE LIMIT 3"
        );
        res.json(rows);
    } catch (err) {
        console.error("Fetch hunts error:", err);
        res.status(500).json({ message: "Error fetching hunts" });
    }
});

// Claim reward for finding a product
router.post("/claim", authMiddleware, async (req, res) => {
    const { product_id } = req.body;
    const userId = req.user.id;

    if (!product_id) return res.status(400).json({ message: "Product ID required" });

    try {
        // 1. Verify it's a target
        const [target] = await db.promise.query(
            "SELECT id FROM products WHERE id = ? AND is_hunt_target = TRUE",
            [product_id]
        );

        if (target.length === 0) {
            return res.status(400).json({ message: "This item is not part of the active hunt." });
        }

        // 2. Check if already claimed
        const [existing] = await db.promise.query(
            "SELECT id FROM price_hunt_rewards WHERE user_id = ? AND product_id = ?",
            [userId, product_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: "You have already claimed your reward for this hunt!" });
        }

        // 3. Generate a dynamic coupon code
        const couponCode = `HUNT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        // 4. Save to rewards and create a temporary coupon in coupons table
        // First insert into rewards
        await db.promise.query(
            "INSERT INTO price_hunt_rewards (user_id, product_id, reward_code) VALUES (?, ?, ?)",
            [userId, product_id, couponCode]
        );

        // Optionally insert into global coupons table if it exists
        try {
            await db.promise.query(
                "INSERT INTO coupons (code, discount_type, discount_value, min_order_value, max_status, expiry_date) VALUES (?, 'percentage', 20, 500, 'active', DATE_ADD(NOW(), INTERVAL 7 DAY))",
                [couponCode]
            );
        } catch (e) {
            console.log("Coupons table might not exist or insertion failed, but reward is logged.");
        }

        res.json({
            success: true,
            message: "Congratulations! You found a hidden treasure!",
            coupon: couponCode,
            discount: "20% OFF"
        });

    } catch (err) {
        console.error("Claim reward error:", err);
        res.status(500).json({ message: "Error claiming reward" });
    }
});

// ADMIN: Get all active hunt targets (no limit)
router.get("/admin/all", async (req, res) => {
    try {
        const [rows] = await db.promise.query(
            "SELECT id, name, image, price, is_hunt_target FROM products WHERE is_hunt_target = TRUE"
        );
        res.json(rows);
    } catch (err) {
        console.error("Fetch admin hunts error:", err);
        res.status(500).json({ message: "Error fetching hunts" });
    }
});

// ADMIN: Toggle hunt status for a product
router.post("/admin/toggle", async (req, res) => {
    const { product_id, status } = req.body;

    if (!product_id) return res.status(400).json({ message: "Product ID required" });

    try {
        await db.promise.query(
            "UPDATE products SET is_hunt_target = ? WHERE id = ?",
            [status, product_id]
        );
        res.json({ success: true, message: `Product ${status ? 'added to' : 'removed from'} hunt` });
    } catch (err) {
        console.error("Toggle hunt error:", err);
        res.status(500).json({ message: "Error updating hunt status" });
    }
});

module.exports = router;
