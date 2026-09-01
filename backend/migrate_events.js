const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const query = `
CREATE TABLE IF NOT EXISTS event_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255),
    user_id INT NULL,
    event_name VARCHAR(255),
    element_selector VARCHAR(255),
    page_url TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const runMigration = async () => {
    console.log("Starting event_logs migration...");
    try {
        await db.promise.query(query);
        console.log("Successfully created event_logs table.");
    } catch (err) {
        console.error("Error creating table:", err);
    }
    process.exit();
};

runMigration();
