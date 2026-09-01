require('dotenv').config();
const db = require('./db').promise;

const createAnalyticsTable = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS analytics (
            id INT AUTO_INCREMENT PRIMARY KEY,
            visitor_id VARCHAR(255) NOT NULL,
            page_url VARCHAR(500),
            event_type VARCHAR(50) DEFAULT 'pageview',
            event_data JSON,
            user_id INT,
            ip_address VARCHAR(45),
            user_agent VARCHAR(500),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    `;

    try {
        await db.query(query);
        console.log("Analytics table created successfully.");
        process.exit();
    } catch (err) {
        console.error("Error creating analytics table:", err);
        process.exit(1);
    }
};

createAnalyticsTable();
