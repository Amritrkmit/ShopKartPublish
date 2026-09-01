const express = require("express");
const router = express.Router();
const db = require("../db");
const authMiddleware = require("../middlewares/userJWT");
const requireAdminJWT = require("../middlewares/requireAdminJWT");

// 1. Fetch all active group deals with product details
router.get("/active", async (req, res) => {
    try {
        const [rows] = await db.promise.query(`
            SELECT gb.*, p.name as product_name, p.price as product_price, p.sale_price as product_sale_price, p.image as product_image, p.slug as product_slug
            FROM group_buys gb
            JOIN products p ON gb.product_id = p.id
            WHERE gb.status = 'active' AND gb.end_time > NOW()
            ORDER BY gb.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching group buys:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// 2. Get details of a specific deal
router.get("/:id", async (req, res) => {
    try {
        const [gbRows] = await db.promise.query(`
            SELECT gb.*, p.name as product_name, p.price as product_price, p.sale_price as product_sale_price, p.image as product_image, p.slug as product_slug
            FROM group_buys gb
            JOIN products p ON gb.product_id = p.id
            WHERE gb.id = ?
        `, [req.params.id]);

        if (gbRows.length === 0) return res.status(404).json({ message: "Deal not found" });

        const [participants] = await db.promise.query(`
            SELECT u.name, gbp.joined_at
            FROM group_buy_participants gbp
            JOIN users u ON gbp.user_id = u.id
            WHERE gbp.group_buy_id = ?
        `, [req.params.id]);

        res.json({ ...gbRows[0], participants });
    } catch (err) {
        console.error("Error fetching deal details:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// 3. Create a new group buy (Admin only for now)
router.post("/create", requireAdminJWT, async (req, res) => {
    const { product_id, target_count, discount_percentage, duration_hours } = req.body;

    if (!product_id || !target_count || !discount_percentage || !duration_hours) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + parseInt(duration_hours));

        const [result] = await db.promise.query(`
            INSERT INTO group_buys (product_id, target_count, discount_percentage, end_time)
            VALUES (?, ?, ?, ?)
        `, [product_id, target_count, discount_percentage, endTime]);

        res.json({ message: "Group buy deal created!", dealId: result.insertId });
    } catch (err) {
        console.error("Error creating group buy:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// 4. Join a group buy
router.post("/join", authMiddleware, async (req, res) => {
    const { dealId } = req.body;
    const userId = req.user.id;

    try {
        // 1. Check if deal is active and not already joined
        const [gb] = await db.promise.query("SELECT * FROM group_buys WHERE id = ? AND status = 'active' AND end_time > NOW()", [dealId]);
        if (gb.length === 0) return res.status(400).json({ message: "Deal is no longer active" });

        const [existing] = await db.promise.query("SELECT * FROM group_buy_participants WHERE group_buy_id = ? AND user_id = ?", [dealId, userId]);
        if (existing.length > 0) return res.status(400).json({ message: "You have already joined this deal" });

        // 2. Add participant
        await db.promise.query("INSERT INTO group_buy_participants (group_buy_id, user_id) VALUES (?, ?)", [dealId, userId]);

        // 3. Update current count
        const newCount = gb[0].current_count + 1;
        let newStatus = 'active';
        if (newCount >= gb[0].target_count) {
            newStatus = 'completed';
        }

        await db.promise.query("UPDATE group_buys SET current_count = ?, status = ? WHERE id = ?", [newCount, newStatus, dealId]);

        res.json({
            message: "Successfully joined the group deal!",
            currentCount: newCount,
            targetCount: gb[0].target_count,
            isCompleted: newStatus === 'completed'
        });
    } catch (err) {
        console.error("Error joining group buy:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// 5. Get deal for a specific product (to show on video feed/product page)
router.get("/product/:productId", async (req, res) => {
    try {
        const [rows] = await db.promise.query(`
            SELECT * FROM group_buys 
            WHERE product_id = ? AND status = 'active' AND end_time > NOW()
            LIMIT 1
        `, [req.params.productId]);
        res.json(rows[0] || null);
    } catch (err) {
        console.error("Error fetching product deal:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// 6. Admin: Get all group deals (Admin only)
router.get("/admin/all", requireAdminJWT, async (req, res) => {
    try {
        const [rows] = await db.promise.query(`
            SELECT gb.*, p.name as product_name, p.image as product_image, p.price as product_price, p.sale_price as product_sale_price
            FROM group_buys gb
            JOIN products p ON gb.product_id = p.id
            ORDER BY gb.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching all group buys:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// 7. Admin: Delete a group deal (Admin only)
router.delete("/admin/:id", requireAdminJWT, async (req, res) => {
    try {
        // Delete participants first (foreign key constraint)
        await db.promise.query("DELETE FROM group_buy_participants WHERE group_buy_id = ?", [req.params.id]);

        // Delete the deal
        const [result] = await db.promise.query("DELETE FROM group_buys WHERE id = ?", [req.params.id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Deal not found" });
        }

        res.json({ message: "Group deal deleted successfully" });
    } catch (err) {
        console.error("Error deleting group buy:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// 8. Admin: Update a group deal (Admin only)
router.put("/admin/:id", requireAdminJWT, async (req, res) => {
    const { target_count, discount_percentage, duration_hours, status } = req.body;
    try {
        // If duration_hours is provided, we calculate a new end_time based on NOW
        // Otherwise we keep the existing end_time
        const query = `
            UPDATE group_buys 
            SET target_count = ?, 
                discount_percentage = ?, 
                end_time = CASE WHEN ? IS NOT NULL AND ? > 0 THEN DATE_ADD(NOW(), INTERVAL ? HOUR) ELSE end_time END,
                status = ?
            WHERE id = ?
        `;
        const [result] = await db.promise.query(query, [
            target_count,
            discount_percentage,
            duration_hours || null,
            duration_hours || 0,
            duration_hours || 0,
            status || 'active',
            req.params.id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Deal not found" });
        }

        res.json({ message: "Group deal updated successfully" });
    } catch (err) {
        console.error("Error updating group buy:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// 9. User: Get deals joined by the logged-in user
router.get("/my-deals", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.promise.query(`
            SELECT gb.*, p.name as product_name, p.image as product_image, p.price as product_price, p.sale_price as product_sale_price, gbp.joined_at
            FROM group_buys gb
            JOIN group_buy_participants gbp ON gb.id = gbp.group_buy_id
            JOIN products p ON gb.product_id = p.id
            WHERE gbp.user_id = ?
            ORDER BY gbp.joined_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching user deals:", err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
