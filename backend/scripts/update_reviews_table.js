const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../db');

const startMigration = async () => {
    console.log("🔄 Starting Review Table Migration...");

    const dbName = 'reactwebsiteapp'; // Hardcoding for safety or use process.env.DB_NAME
    const addImagesColumn = `ALTER TABLE ${dbName}.reviews ADD COLUMN images JSON DEFAULT NULL;`;

    // Check if column exists first to avoid error
    db.query(
        "SELECT count(*) as count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'images'",
        [process.env.DB_NAME || 'reactwebsiteapp'],
        (err, results) => {
            if (err) {
                console.error("❌ Error checking schema:", err);
                process.exit(1);
            }

            if (results[0].count > 0) {
                console.log("✅ 'images' column already exists in 'reviews' table.");
                process.exit(0);
            } else {
                db.query(addImagesColumn, (alterErr) => {
                    if (alterErr) {
                        console.error("❌ Error adding 'images' column:", alterErr);
                        process.exit(1);
                    }
                    console.log("✅ Successfully added 'images' column to 'reviews' table.");
                    process.exit(0);
                });
            }
        }
    );
};

startMigration();
