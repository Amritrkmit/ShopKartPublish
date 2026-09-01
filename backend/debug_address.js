require("dotenv").config();
const db = require("./db");

async function checkOrders() {
    const [rows] = await db.promise.query("SELECT id, shipping_address, created_at FROM orders ORDER BY created_at DESC LIMIT 5");
    console.log(rows);
    process.exit();
}

checkOrders();
