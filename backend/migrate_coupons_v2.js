const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

// Add is_public column to coupons table to allow "Global/Default" coupons
const updateSchema = async () => {
    try {
        console.log('--- Updating Coupons Schema ---');

        // 1. Add is_public column
        try {
            await db.promise.query(`
                ALTER TABLE coupons 
                ADD COLUMN is_public BOOLEAN DEFAULT FALSE AFTER is_active
            `);
            console.log("✅ Added 'is_public' column");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'is_public' column already exists");
            } else {
                throw err;
            }
        }

        // 2. Mark existing default coupons (WELCOME10, etc) as public
        const defaults = ['WELCOME10', 'FLAT500', 'SAVE20']; // These should be visible to everyone
        await db.promise.query("UPDATE coupons SET is_public = TRUE WHERE code IN (?)", [defaults]);
        console.log("✅ Marked default coupons as public");

        console.log("--- Update Complete ---");
        process.exit(0);

    } catch (err) {
        console.error("❌ Migration Failed:", err);
        process.exit(1);
    }
};

updateSchema();
