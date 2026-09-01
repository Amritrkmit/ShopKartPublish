const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const query = `
CREATE TABLE IF NOT EXISTS tracking_scripts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('HEAD', 'BODY_START', 'BODY_END') DEFAULT 'HEAD',
    category ENUM('essential', 'analytics', 'marketing') DEFAULT 'analytics',
    content TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const runMigration = async () => {
    console.log("Starting tracking_scripts migration...");
    try {
        await db.promise.query(query);
        console.log("Successfully created tracking_scripts table.");
    } catch (err) {
        console.error("Error creating table:", err);
    }
    process.exit();
};

runMigration();
