const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const setupStreaks = async () => {
    try {
        await db.promise.query(`
            CREATE TABLE IF NOT EXISTS user_streaks (
                user_id INT PRIMARY KEY,
                current_streak INT DEFAULT 1,
                longest_streak INT DEFAULT 1,
                last_login_date DATE,
                total_points INT DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'user_streaks' table created.");
        process.exit();
    } catch (err) {
        console.error("❌ Error setting up streaks:", err);
        process.exit(1);
    }
};

setupStreaks();
