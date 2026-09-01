const express = require("express");
const router = express.Router();
const db = require("../db");

// GET settings by group
router.get("/:group", async (req, res) => {
    const { group } = req.params;
    try {
        const [rows] = await db.promise.query(
            "SELECT key_name, value FROM settings WHERE group_name = ?",
            [group]
        );
        // Convert to key-value object
        const settings = rows.reduce((acc, row) => {
            acc[row.key_name] = row.value;
            return acc;
        }, {});

        res.json(settings);
    } catch (err) {
        console.error("Fetch settings error:", err);
        res.status(500).json({ message: "Error fetching settings" });
    }
});

// POST update settings (Bulk upsert)
router.post("/update", async (req, res) => {
    const { group, settings } = req.body; // settings is object { key: value }

    if (!group || !settings) return res.status(400).json({ message: "Group and settings required" });

    try {
        const queries = Object.entries(settings).map(([key, value]) => {
            return db.promise.query(
                "INSERT INTO settings (group_name, key_name, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?",
                [group, key, value, value]
            );
        });

        await Promise.all(queries);
        res.json({ success: true, message: "Settings updated successfully" });
    } catch (err) {
        console.error("Update settings error:", err);
        res.status(500).json({ message: "Error updating settings" });
    }
});

module.exports = router;
