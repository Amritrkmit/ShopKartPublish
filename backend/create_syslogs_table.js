const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const createSystemLogsTable = async () => {
    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS system_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                level VARCHAR(20) DEFAULT 'error', -- 'error', 'warning', 'info'
                message TEXT,
                meta JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await db.promise.query(sql);
        console.log("✅ 'system_logs' table ready.");
        process.exit();
    } catch (err) {
        console.error("❌ Error creating system_logs table:", err);
        process.exit(1);
    }
};

createSystemLogsTable();
