require("dotenv").config();
const db = require("./db");

async function addInventoryFields() {
    try {
        console.log("Adding inventory management fields to products table...");

        const alterQueries = [
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2) DEFAULT NULL",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100) DEFAULT NULL",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) DEFAULT NULL",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT FALSE",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_status ENUM('in_stock', 'out_of_stock', 'on_backorder') DEFAULT 'in_stock'",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 2) DEFAULT NULL",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100) DEFAULT NULL",
            "ALTER TABLE products ADD COLUMN IF NOT EXISTS shipping_class VARCHAR(50) DEFAULT 'standard'"
        ];

        for (const query of alterQueries) {
            try {
                await db.promise.query(query);
                console.log("✓", query.substring(0, 60) + "...");
            } catch (err) {
                if (err.code === 'ER_DUP_FIELDNAME') {
                    console.log("⊘ Field already exists:", query.substring(0, 60) + "...");
                } else {
                    throw err;
                }
            }
        }

        console.log("\n✅ Inventory fields added successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
}

addInventoryFields();
