const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const setupPriceHistory = async () => {
    try {
        await db.promise.query(`
            CREATE TABLE IF NOT EXISTS price_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);
        console.log("✅ Table 'price_history' created or already exists.");

        // Optionally seed some data for existing products to show the chart immediately
        const [products] = await db.promise.query("SELECT id, sale_price FROM products LIMIT 5");
        for (const p of products) {
            // Add a few historical points
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const fakeDate = new Date(now);
                fakeDate.setDate(now.getDate() - (i * 7)); // Every week
                const fakePrice = p.sale_price * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10%
                await db.promise.query(
                    "INSERT INTO price_history (product_id, price, recorded_at) VALUES (?, ?, ?)",
                    [p.id, fakePrice, fakeDate]
                );
            }
        }
        console.log("✅ Seeded initial price history for 5 products.");

        process.exit();
    } catch (err) {
        console.error("❌ Error setting up price history:", err);
        process.exit(1);
    }
};

setupPriceHistory();
