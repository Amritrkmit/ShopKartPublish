const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdminJWT = require('../middlewares/requireAdminJWT');

// Public: Log Interaction Event
router.post('/', async (req, res) => {
    const { session_id, user_id, event_name, element_selector, page_url, metadata } = req.body;

    try {

        let username = null;
        let email = null;

        // ✅ If user is logged in, fetch username
        if (user_id) {
            const [userRows] = await db.promise.query(
                `SELECT name,email FROM users WHERE id = ? LIMIT 1`,
                [user_id]
            );

            if (userRows.length > 0) {
                username = userRows[0].name;
                email = userRows[0].email;
            }
        }

        await db.promise.query(
            `INSERT INTO event_logs (session_id, user_id, username, email, event_name, element_selector, page_url, metadata) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [session_id, user_id || null, username || null, email || null, event_name, element_selector, page_url, JSON.stringify(metadata)]
        );
        res.status(201).json({ message: 'Event logged' });
    } catch (err) {
        console.error("Error logging event:", err);
        // Don't leak error details to public
        res.status(500).json({ error: 'Failed to log event' });
    }
});

// Admin: Get Event Logs (Paginated & Searchable)
router.get('/admin', requireAdminJWT, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    try {
        let whereClause = "";
        const queryParams = [];

        if (search) {
            whereClause = "WHERE event_name LIKE ? OR page_url LIKE ? OR session_id LIKE ?";
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Get Total Count
        const [countResult] = await db.promise.query(
            `SELECT COUNT(*) as total FROM event_logs ${whereClause}`,
            queryParams
        );
        const total = countResult[0].total;

        // Get Data
        const [events] = await db.promise.query(
            `SELECT * FROM event_logs ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...queryParams, limit, offset]
        );

        res.json({
            data: events,
            pagination: {
                total,
                page,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Error fetching events:", err);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Public Test Route
router.get('/test', (req, res) => res.json({ message: 'Events API is working' }));

// Admin: Get unique URLs with event counts for heatmap selection
router.get('/heatmap/urls', requireAdminJWT, async (req, res) => {
    try {
        console.log("📊 Fetching Heatmap URLs for admin:", req.admin?.id);
        const [rows] = await db.promise.query(
            "SELECT page_url, COUNT(*) as count FROM event_logs WHERE page_url IS NOT NULL GROUP BY page_url ORDER BY count DESC"
        );
        console.log(`✅ Found ${rows.length} unique URLs`);
        res.json(rows);
    } catch (err) {
        console.error("❌ Error fetching heatmap URLs:", err);
        res.status(500).json({ error: 'Failed to fetch URLs' });
    }
});

// Admin: Get heatmap coordinates for a specific URL
router.get('/heatmap', requireAdminJWT, async (req, res) => {
    const { page_url } = req.query;
    if (!page_url) return res.status(400).json({ error: 'page_url is required' });

    try {
        const [rows] = await db.promise.query(
            "SELECT event_name, element_selector, metadata, created_at FROM event_logs WHERE page_url = ?",
            [page_url]
        );
        // Map to coordinates, ignoring rows without x/y
        const points = rows.map(r => {
            try {
                const meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata;
                // Prioritize pageX/pageY (absolute position) over clientX/clientY (viewport relative)
                const x = meta.pageX || meta.x;
                const y = meta.pageY || meta.y;
                if (x && y) {
                    return {
                        x: x,
                        y: y,
                        event_name: r.event_name,
                        selector: r.element_selector,
                        created_at: r.created_at
                    };
                }
                return null;
            } catch (e) { return null; }
        }).filter(Boolean);

        res.json(points);
    } catch (err) {
        console.error("Error fetching heatmap data:", err);
        res.status(500).json({ error: 'Failed to fetch heatmap data' });
    }
});

module.exports = router;
