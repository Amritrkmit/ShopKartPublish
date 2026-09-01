require('dotenv').config();
const db = require('./db');

const addColumn = async () => {
    try {
        const [rows] = await db.promise.query("SHOW COLUMNS FROM products LIKE 'product_features'");
        if (rows.length === 0) {
            await db.promise.query("ALTER TABLE products ADD COLUMN product_features JSON DEFAULT NULL");
            console.log("✅ Column 'product_features' added successfully.");
        } else {
            console.log("ℹ️ Column 'product_features' already exists.");
        }
        process.exit(0);
    } catch (err) {
        console.error("❌ Error adding column:", err);
        process.exit(1);
    }
};

addColumn();
