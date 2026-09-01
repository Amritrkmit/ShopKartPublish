require('dotenv').config();
const db = require('../db');

const alterTable = async () => {
    try {
        console.log("Starting migration...");

        const queries = [
            "ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) DEFAULT NULL",
            "ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS mobile VARCHAR(20) DEFAULT NULL",
            "ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS alternate_mobile VARCHAR(20) DEFAULT NULL",
            "ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS flat_house VARCHAR(255) DEFAULT NULL"
        ];

        for (const query of queries) {
            await db.promise.query(query);
            console.log(`Executed: ${query}`);
        }

        console.log("Migration completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

alterTable();
