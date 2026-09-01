require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        console.log("Checking products table for shop_id column...");
        const [columns] = await db.promise.query("SHOW COLUMNS FROM products LIKE 'shop_id'");

        if (columns.length === 0) {
            console.log("Adding shop_id column to products table...");
            await db.promise.query("ALTER TABLE products ADD COLUMN shop_id INT AFTER subcategory_id");
            await db.promise.query("ALTER TABLE products ADD FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE");
            console.log("✅ shop_id column and foreign key added successfully!");
        } else {
            console.log("ℹ️ shop_id column already exists.");
        }

        // Add index on shop_id for performance
        await db.promise.query("ALTER TABLE products ADD INDEX IF NOT EXISTS idx_shop_id (shop_id)");
        console.log("✅ Index on shop_id ensured.");

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
