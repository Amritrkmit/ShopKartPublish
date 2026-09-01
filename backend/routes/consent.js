const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdminJWT = require('../middlewares/requireAdminJWT');

// Public: Save Consent Log
router.post('/', async (req, res) => {
    const { preferences, userId } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    try {

        let username = null;
        let email = null;

        // ✅ If user is logged in, fetch username
        if (userId) {
            const [userRows] = await db.promise.query(
                `SELECT name,email FROM users WHERE id = ? LIMIT 1`,
                [userId]
            );

            if (userRows.length > 0) {
                username = userRows[0].name;
                email = userRows[0].email;
            }
        }
        console.log("Username:", username);
        await db.promise.query(
            `INSERT INTO consent_logs (user_id, username, email, ip_address, user_agent, consent_data) VALUES (?, ?, ?, ?, ?, ?)`,
            [userId || null, username || null, email || null, ip, userAgent, JSON.stringify(preferences)]
        );
        res.status(201).json({ message: 'Consent logged successfully' });
    } catch (err) {
        console.error("Error logging consent:", err);
        res.status(500).json({ error: 'Failed to log consent' });
    }
});

// Admin: Get Consent Logs (Paginated & Searchable)
router.get('/logs', requireAdminJWT, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    try {
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = "WHERE ip_address LIKE ? OR user_agent LIKE ? OR user_id LIKE ? ";
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get Total Count
        const [countResult] = await db.promise.query(
            `SELECT COUNT(*) as total FROM consent_logs ${whereClause}`,
            queryParams
        );
        const total = countResult[0].total;

        // Get Data
        const [logs] = await db.promise.query(
            `SELECT * FROM consent_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        res.json({
            data: logs,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Error fetching consent logs:", err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;
