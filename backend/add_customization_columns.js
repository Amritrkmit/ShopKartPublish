const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const db = require('./db');
const util = require('util');
const query = util.promisify(db.query).bind(db);

(async () => {
    try {
        console.log("Adding customization columns...");

        // 1. products table
        try {
            await query("ALTER TABLE products ADD COLUMN is_customizable TINYINT(1) DEFAULT 0");
            console.log("Added is_customizable to products");
        } catch (e) {
            console.log("is_customizable might already exist:", e.message);
        }

        try {
            await query("ALTER TABLE products ADD COLUMN customization_fields JSON NULL");
            console.log("Added customization_fields to products");
        } catch (e) {
            console.log("customization_fields might already exist:", e.message);
        }

        // 2. cart_items table
        try {
            await query("ALTER TABLE cart_items ADD COLUMN customization_details JSON NULL");
            console.log("Added customization_details to cart_items");
        } catch (e) {
            console.log("customization_details might already exist in cart_items:", e.message);
        }

        // 3. orders table
        try {
            await query("ALTER TABLE orders ADD COLUMN has_customized_items TINYINT(1) DEFAULT 0");
            console.log("Added has_customized_items to orders");
        } catch (e) {
            console.log("has_customized_items might already exist in orders:", e.message);
        }

        try {
            // production_status: 'pending', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'
            await query("ALTER TABLE orders ADD COLUMN production_status ENUM('pending', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending'");
            console.log("Added production_status to orders");
        } catch (e) {
            console.log("production_status might already exist in orders:", e.message);
        }

        console.log("Schema update complete!");
        process.exit(0);

    } catch (err) {
        console.error("Schema update failed:", err);
        process.exit(1);
    }
})();
