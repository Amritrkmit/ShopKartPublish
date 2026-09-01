const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdminJWT = require('../middlewares/requireAdminJWT');

// Public: Get all ENABLED scripts
router.get('/', async (req, res) => {
    try {
        const [scripts] = await db.promise.query(
            "SELECT type, category, content FROM tracking_scripts WHERE is_enabled = TRUE"
        );
        res.json(scripts);
    } catch (err) {
        console.error("Error fetching scripts:", err);
        res.status(500).json({ error: 'Failed to fetch scripts' });
    }
});

// Admin: Get ALL scripts
router.get('/admin', requireAdminJWT, async (req, res) => {
    try {
        const [scripts] = await db.promise.query("SELECT * FROM tracking_scripts ORDER BY created_at DESC");
        res.json(scripts);
    } catch (err) {
        console.error("Error fetching admin scripts:", err);
        res.status(500).json({ error: 'Failed to fetch scripts' });
    }
});

// Admin: Create Script
router.post('/admin', requireAdminJWT, async (req, res) => {
    const { name, type, category, content } = req.body;
    try {
        await db.promise.query(
            "INSERT INTO tracking_scripts (name, type, category, content) VALUES (?, ?, ?, ?)",
            [name, type || 'HEAD', category || 'analytics', content]
        );
        res.status(201).json({ message: 'Script created' });
    } catch (err) {
        console.error("Error creating script:", err);
        res.status(500).json({ error: 'Failed to create script' });
    }
});

// Admin: Update Script
router.put('/admin/:id', requireAdminJWT, async (req, res) => {
    const { name, type, category, content, is_enabled } = req.body;
    try {
        await db.promise.query(
            "UPDATE tracking_scripts SET name=?, type=?, category=?, content=?, is_enabled=? WHERE id=?",
            [name, type, category, content, is_enabled, req.params.id]
        );
        res.json({ message: 'Script updated' });
    } catch (err) {
        console.error("Error updating script:", err);
        res.status(500).json({ error: 'Failed to update script' });
    }
});

// Admin: Delete Script
router.delete('/admin/:id', requireAdminJWT, async (req, res) => {
    try {
        await db.promise.query("DELETE FROM tracking_scripts WHERE id = ?", [req.params.id]);
        res.json({ message: 'Script deleted' });
    } catch (err) {
        console.error("Error deleting script:", err);
        res.status(500).json({ error: 'Failed to delete script' });
    }
});

module.exports = router;
