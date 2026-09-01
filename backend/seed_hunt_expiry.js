const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const updateSettings = async () => {
    try {
        const group = 'price_hunt';
        const key = 'hunt_expiry';
        const value = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

        await db.promise.query(
            "INSERT INTO settings (group_name, key_name, value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = ?",
            [group, key, value, value]
        );
        console.log(`✅ Setting updated: ${group}.${key} = ${value}`);
        process.exit();
    } catch (err) {
        console.error("❌ Error updating settings:", err);
        process.exit(1);
    }
};

updateSettings();
