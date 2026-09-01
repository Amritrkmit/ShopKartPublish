require('dotenv').config();
const db = require('./db');

async function runMigrations() {
    try {
        console.log("Running location optimizations...");
        await db.promise.query("ALTER TABLE shops ADD INDEX IF NOT EXISTS idx_location (latitude, longitude)");
        await db.promise.query("ALTER TABLE shops ADD INDEX IF NOT EXISTS idx_city (city)");
        await db.promise.query("ALTER TABLE shops ADD INDEX IF NOT EXISTS idx_pincode (pincode)");
        console.log("✅ Optimization indexes added successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigrations();
