const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const setupRewards = async () => {
    try {
        console.log("🚀 Setting up rewards and transactions tables...");

        // 1. Transactions Table (for credits and debits with expiry)
        await db.promise.query(`
            CREATE TABLE IF NOT EXISTS supercoin_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                amount INT NOT NULL, -- Positive for credit, negative for debit
                type ENUM('EARNED', 'REDEEMED', 'EXPIRED') DEFAULT 'EARNED',
                description VARCHAR(255),
                order_id INT NULL,
                expiry_date DATE NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'supercoin_transactions' table created.");

        // 2. User Rewards Table (for scratch cards)
        await db.promise.query(`
            CREATE TABLE IF NOT EXISTS user_rewards (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                order_id INT NOT NULL,
                reward_value INT NOT NULL,
                status ENUM('PENDING', 'SCRATCHED', 'EXPIRED') DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scratched_at TIMESTAMP NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ 'user_rewards' table created.");

        process.exit(0);
    } catch (err) {
        console.error("❌ Error setting up rewards:", err);
        process.exit(1);
    }
};

setupRewards();
