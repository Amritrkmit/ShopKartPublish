require("dotenv").config();
const db = require("./db");

async function checkSellers() {
    try {
        const [sellers] = await db.promise.execute(`
            SELECT s.*, u.name as owner_name, u.email as owner_email, sh.city, sh.name as shop_name
            FROM sellers s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN shops sh ON s.id = sh.seller_id
        `);
        console.log("Sellers Data:", JSON.stringify(sellers, null, 2));
        process.exit(0);
    } catch (err) {
        console.error("Error checking sellers:", err);
        process.exit(1);
    }
}

checkSellers();
