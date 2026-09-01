const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const upgradeReviewsTable = async () => {
    try {
        await db.promise.query(`
            ALTER TABLE reviews 
            ADD COLUMN IF NOT EXISTS delivery_rating INT DEFAULT 5,
            ADD COLUMN IF NOT EXISTS packaging_rating INT DEFAULT 5
        `);
        console.log("✅ Table 'reviews' upgraded with vibe metrics.");

        // Update arbitrary data for existing reviews to test
        await db.promise.query("UPDATE reviews SET delivery_rating = FLOOR(1 + RAND() * 5), packaging_rating = FLOOR(1 + RAND() * 5) WHERE delivery_rating = 5");
        console.log("✅ Seeded random vibe metrics for existing reviews.");

        process.exit();
    } catch (err) {
        console.error("❌ Error upgrading reviews table:", err);
        process.exit(1);
    }
};

upgradeReviewsTable();
