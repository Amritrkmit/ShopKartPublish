const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

const createAlertsTable = async () => {
    try {
        const sql = `
            CREATE TABLE IF NOT EXISTS product_alerts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                alert_type ENUM('price_drop', 'restock') NOT NULL,
                target_price DECIMAL(10, 2) DEFAULT NULL,
                status ENUM('active', 'triggered', 'cancelled') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `;
        await db.promise.query(sql);
        console.log("✅ 'product_alerts' table ready.");
        process.exit();
    } catch (err) {
        console.error("❌ Error creating product_alerts table:", err);
        process.exit(1);
    }
};

createAlertsTable();
