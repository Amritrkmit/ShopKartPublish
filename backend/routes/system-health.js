const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdminJWT = require('../middlewares/requireAdminJWT');

router.get('/dashboard', requireAdminJWT, async (req, res) => {
    try {
        const promiseDb = db.promise;

        const stats = {
            failed_payments: 0,
            abandoned_carts: 0,
            api_errors: 0,
            order_sync_issues: 0,
            payment_success_rate: 0
        };

        // 1. Failed Payments (Last 30 Days)
        // Adjust status check based on actual flow. Assuming 'cancelled' or 'failed' implies payment failure often.
        const [failedRows] = await promiseDb.query(`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE (status = 'failed' OR status = 'cancelled') 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        stats.failed_payments = failedRows[0].count;

        // 2. Abandoned Carts (Last 24 Hours)
        // Proxy: Unique sessions that viewed cart/checkout but didn't purchase
        // or strictly 'add_to_cart' event without 'purchase' event
        const [abandonedRows] = await promiseDb.query(`
            SELECT COUNT(DISTINCT a.visitor_id) as count
            FROM analytics a
            WHERE a.event_type = 'add_to_cart'
            AND a.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            AND a.visitor_id NOT IN (
                SELECT visitor_id FROM analytics 
                WHERE event_type = 'purchase' 
                AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            )
        `);
        stats.abandoned_carts = abandonedRows[0].count;

        // 3. API Errors (Last 24 Hours)
        const [errorRows] = await promiseDb.query(`
            SELECT COUNT(*) as count 
            FROM system_logs 
            WHERE level = 'error' 
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);
        stats.api_errors = errorRows[0].count;

        // 4. Order Sync Issues (Pending > 24h)
        const [syncRows] = await promiseDb.query(`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE status = 'pending' 
            AND created_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);
        stats.order_sync_issues = syncRows[0].count;

        // 5. Payment Gateway Success Rate (Last 30 Days)
        const [totalOrdersRows] = await promiseDb.query(`
            SELECT COUNT(*) as count 
            FROM orders 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `);
        const total = totalOrdersRows[0].count;
        const success = total - stats.failed_payments; // Rough approximation

        stats.payment_success_rate = total > 0 ? ((success / total) * 100).toFixed(1) : 100;

        res.json(stats);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// Logs Endpoint for detailed view
router.get('/logs', requireAdminJWT, async (req, res) => {
    try {
        const [logs] = await db.promise.query("SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 50");
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
