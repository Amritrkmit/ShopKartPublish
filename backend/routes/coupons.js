const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAdminJWT = require("../middlewares/requireAdminJWT");
const authMiddleware = require("../middlewares/userJWT");

// ----------------- ADMIN ROUTES (CRUD & ASSIGN) -----------------

// Create a new coupon
router.post("/admin", requireAdminJWT, async (req, res) => {
    const { code, description, discount_type, discount_value, min_order_value, max_discount_value, valid_until, usage_limit } = req.body;

    if (!code || !discount_type || !discount_value) {
        return res.status(400).json({ message: "Code, Type, and Value are required" });
    }

    try {
        const query = `
            INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, max_discount_value, valid_until, usage_limit, is_public)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.promise.query(query, [
            code.toUpperCase(),
            description,
            discount_type,
            discount_value,
            min_order_value || 0,
            max_discount_value,
            valid_until || null,
            usage_limit || null,
            req.body.is_public || false
        ]);
        res.json({ message: "Coupon created", id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Coupon code already exists" });
        console.error(err);
        res.status(500).json({ message: "DB Error" });
    }
});

// List all coupons (for admin manager)
router.get("/admin", requireAdminJWT, async (req, res) => {
    try {
        const [coupons] = await db.promise.query("SELECT * FROM coupons ORDER BY created_at DESC");
        res.json(coupons);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "DB Error" });
    }
});

// Update coupon
router.put("/admin/:id", requireAdminJWT, async (req, res) => {
    const { code, description, discount_type, discount_value, min_order_value, valid_until, usage_limit, is_public } = req.body;

    try {
        const query = `
            UPDATE coupons 
            SET code = ?, description = ?, discount_type = ?, discount_value = ?, min_order_value = ?, valid_until = ?, usage_limit = ?, is_public = ?
            WHERE id = ?
        `;
        await db.promise.query(query, [
            code.toUpperCase(),
            description,
            discount_type,
            discount_value,
            min_order_value,
            valid_until || null,
            usage_limit || null,
            is_public,
            req.params.id
        ]);
        res.json({ message: "Coupon updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "DB Error" });
    }
});

// Delete coupon
router.delete("/admin/:id", requireAdminJWT, async (req, res) => {
    try {
        await db.promise.query("DELETE FROM coupons WHERE id = ?", [req.params.id]);
        res.json({ message: "Coupon deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "DB Error" });
    }
});

// Toggle Active Status
router.patch("/admin/:id/toggle", requireAdminJWT, async (req, res) => {
    try {
        await db.promise.query("UPDATE coupons SET is_active = NOT is_active WHERE id = ?", [req.params.id]);
        res.json({ message: "Coupon status updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "DB Error" });
    }
});

// Assign Coupon to User(s) - Supports bulk assignment
router.post("/admin/assign", requireAdminJWT, async (req, res) => {
    const { user_ids, coupon_id } = req.body; // user_ids can be array or single id
    if ((!user_ids || user_ids.length === 0) || !coupon_id) return res.status(400).json({ message: "User(s) and Coupon required" });

    const idsToAssign = Array.isArray(user_ids) ? user_ids : [user_ids];

    try {
        let assignedCount = 0;
        for (const uid of idsToAssign) {
            // Check if already assigned
            const [existing] = await db.promise.query(
                "SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?",
                [uid, coupon_id]
            );

            if (existing.length === 0) {
                await db.promise.query(
                    "INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)",
                    [uid, coupon_id]
                );
                assignedCount++;
            }
        }

        res.json({ message: `Coupon assigned to ${assignedCount} users successfully` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "DB Error" });
    }
});


// Get users assigned to a coupon
router.get("/admin/:id/users", requireAdminJWT, async (req, res) => {
    try {
        const [rows] = await db.promise.query("SELECT user_id FROM user_coupons WHERE coupon_id = ?", [req.params.id]);
        const userIds = rows.map(r => r.user_id);
        res.json(userIds);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "DB Error" });
    }
});


// ----------------- PUBLIC / USER ROUTES -----------------

// Get My Coupons (Assigned + Public)
router.get("/my-coupons", authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT c.*, uc.assigned_at, uc.is_used 
            FROM coupons c
            LEFT JOIN user_coupons uc ON uc.coupon_id = c.id AND uc.user_id = ?
            WHERE (uc.user_id = ? OR c.is_public = TRUE) 
              AND c.is_active = TRUE
            ORDER BY c.created_at DESC`;

        const [coupons] = await db.promise.query(query, [req.user.id, req.user.id]);
        res.json(coupons);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "DB Error" });
    }
});

// Validate Coupon (Replacing frontend hardcoded logic)
router.post("/validate", async (req, res) => {
    const { code, order_value } = req.body;
    if (!code) return res.status(400).json({ message: "Coupon code required" });

    try {
        const [rows] = await db.promise.query("SELECT * FROM coupons WHERE code = ? AND is_active = TRUE", [code]);
        if (rows.length === 0) return res.status(404).json({ message: "Invalid coupon code" });

        const coupon = rows[0];

        // Check expiry
        if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
            return res.status(400).json({ message: "Coupon expired" });
        }

        // Check usage limit
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ message: "Coupon usage limit reached" });
        }

        // Check min order value
        if (order_value < coupon.min_order_value) {
            return res.status(400).json({
                message: `Minimum order value of ₹${coupon.min_order_value} required`
            });
        }

        res.json({
            success: true,
            coupon: {
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                max_discount_value: coupon.max_discount_value
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
