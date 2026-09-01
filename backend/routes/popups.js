const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdminJWT = require('../middlewares/requireAdminJWT');
const { PopupDTO } = require('../dtos'); // Import DTO for data cleaning

// Public: Get Active Popup (with parsed JSON content)
router.get('/active', async (req, res) => {
    try {
        const [popups] = await db.promise.query(
            "SELECT * FROM marketing_popups WHERE is_active = TRUE LIMIT 1"
        );

        // Clean and parse the popup data
        const cleanedPopup = popups[0] ? PopupDTO.toPublic(popups[0]) : null;
        res.json(cleanedPopup);
    } catch (err) {
        console.error("Error fetching active popup:", err);
        res.status(500).json({ error: 'Failed to fetch popup' });
    }
});

// Admin: Get All Popups
router.get('/admin', requireAdminJWT, async (req, res) => {
    try {
        const [popups] = await db.promise.query("SELECT * FROM marketing_popups ORDER BY created_at DESC");
        res.json(popups);
    } catch (err) {
        console.error("Error fetching admin popups:", err);
        res.status(500).json({ error: 'Failed to fetch popups' });
    }
});

// Admin: Update Popup
router.put('/admin/:id', requireAdminJWT, async (req, res) => {
    const { title, type, content, trigger_type, trigger_value, is_active } = req.body;
    try {
        // Enforce single active popup rule (optional but good for UX)
        if (is_active) {
            await db.promise.query("UPDATE marketing_popups SET is_active = FALSE WHERE id != ?", [req.params.id]);
        }

        await db.promise.query(
            `UPDATE marketing_popups 
             SET title=?, type=?, content=?, trigger_type=?, trigger_value=?, is_active=? 
             WHERE id=?`,
            [title, type, JSON.stringify(content), trigger_type, trigger_value, is_active, req.params.id]
        );
        res.json({ message: 'Popup updated' });
    } catch (err) {
        console.error("Error updating popup:", err);
        res.status(500).json({ error: 'Failed to update popup' });
    }
});

module.exports = router;
