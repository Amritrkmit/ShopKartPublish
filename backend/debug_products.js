const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require('./db');

const checkProducts = async () => {
    try {
        const [rows] = await db.promise.query("SELECT COUNT(*) as count FROM products");
        console.log("Total products in DB:", rows[0].count);

        const [sample] = await db.promise.query("SELECT id, name, status FROM products LIMIT 5");
        console.log("Sample Products:", sample);

        process.exit();
    } catch (err) {
        console.error("❌ Error checking products:", err);
        process.exit(1);
    }
};

checkProducts();
