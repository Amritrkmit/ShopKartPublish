const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdminJWT = require('../middlewares/requireAdminJWT');
const authMiddleware = require('../middlewares/userJWT');
const { sendPriceAlertEmail, sendStockAlertEmail } = require('../utils/email');

// 1. Subscribe to Alert (User)
router.post('/subscribe', authMiddleware, async (req, res) => {
    const { product_id, alert_type, target_price } = req.body;

    if (!product_id || !alert_type) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const promiseDb = db.promise;

        // Check if already subscribed
        const [existing] = await promiseDb.query(`
            SELECT id FROM product_alerts 
            WHERE user_id = ? AND product_id = ? AND alert_type = ? AND status = 'active'
        `, [req.user.id, product_id, alert_type]);

        if (existing.length > 0) {
            return res.status(409).json({ message: "You are already subscribed to this alert." });
        }

        await promiseDb.query(`
            INSERT INTO product_alerts (user_id, product_id, alert_type, target_price)
            VALUES (?, ?, ?, ?)
        `, [req.user.id, product_id, alert_type, target_price || null]);

        res.status(201).json({ message: "Alert subscription successful!" });
    } catch (err) {
        console.error("Alert Subscribe Error:", err);
        res.status(500).json({ message: "Failed to subscribe" });
    }
});

// 2. Get User Alerts (User)
router.get('/my-alerts', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.promise.query(`
            SELECT pa.*, p.name as product_name, p.images 
            FROM product_alerts pa
            JOIN products p ON pa.product_id = p.id
            WHERE pa.user_id = ?
            ORDER BY pa.created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch alerts" });
    }
});

// 3. Admin: Get All Alerts (Admin Dashboard)
router.get('/admin/all', requireAdminJWT, async (req, res) => {
    try {
        const [rows] = await db.promise.query(`
            SELECT pa.*, u.email as user_email, p.name as product_name 
            FROM product_alerts pa
            JOIN users u ON pa.user_id = u.id
            JOIN products p ON pa.product_id = p.id
            ORDER BY pa.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch alerts" });
    }
});

// 4. Admin: Simulate/Trigger Check (Manual Trigger)
// In a real app, this would be a CRON job or hooked into Product Update
router.post('/admin/check-trigger', requireAdminJWT, async (req, res) => {
    try {
        const promiseDb = db.promise;
        const [alerts] = await promiseDb.query(`
            SELECT pa.*, p.sale_price as current_price, p.stock as current_stock, p.name as product_name, u.email
            FROM product_alerts pa
            JOIN products p ON pa.product_id = p.id
            JOIN users u ON pa.user_id = u.id
            WHERE pa.status = 'active'
        `);

        let triggeredCount = 0;
        const triggeredDetails = [];

        for (const alert of alerts) {
            let shouldTrigger = false;

            if (alert.alert_type === 'restock' && alert.current_stock > 0) {
                shouldTrigger = true;
                // Send Restock Email
                await sendStockAlertEmail(alert.email, alert.product_name, alert.product_id);
            } else if (alert.alert_type === 'price_drop') {
                // If target price set, check if below. Else, check if any drop (needs history ideally, but for now we assume simple logic: strict target or just "current < target" if target exists)
                // If no target price in DB, maybe we just notify on ANY drop? Complexity.
                // Let's assume user sets Current Price as Trigger Price when subscribing.
                if (alert.target_price && alert.current_price <= alert.target_price) {
                    shouldTrigger = true;
                    // Send Price Drop Email
                    // Note: We might want the 'Original Price' from the alert record if we stored it,
                    // but for now we'll just show current price vs target.
                    await sendPriceAlertEmail(alert.email, alert.product_name, alert.target_price + 100, alert.current_price, alert.product_id);
                }
            }

            if (shouldTrigger) {
                // Mark as triggered in DB
                await promiseDb.query("UPDATE product_alerts SET status = 'triggered' WHERE id = ?", [alert.id]);
                triggeredCount++;
                triggeredDetails.push({ email: alert.email, product: alert.product_name, type: alert.alert_type });
            }
        }

        res.json({
            message: "Check complete",
            triggered: triggeredCount,
            details: triggeredDetails
        });

    } catch (err) {
        console.error("Check Trigger Error:", err);
        res.status(500).json({ message: "Failed to check alerts" });
    }
});

module.exports = router;
