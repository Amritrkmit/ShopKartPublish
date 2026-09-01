const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const query = `
CREATE TABLE IF NOT EXISTS consent_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    consent_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const runMigration = async () => {
    console.log("Starting consent_logs migration...");
    try {
        await db.promise.query(query);
        console.log("Successfully created consent_logs table.");
    } catch (err) {
        console.error("Error creating table:", err);
    }
    process.exit();
};

runMigration();
