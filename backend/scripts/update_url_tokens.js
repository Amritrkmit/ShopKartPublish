const mysql = require('mysql2');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');
const { ulid } = require('ulid');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const updateProducts = async () => {
    try {
        const [products] = await db.promise().query("SELECT id, url_token, product_uid FROM products WHERE url_token IS NULL OR product_uid IS NULL");

        console.log(`Found ${products.length} products to update.`);

        for (const product of products) {
            const url_token = product.url_token || crypto.randomBytes(8).toString('hex'); // 16 chars
            const product_uid = product.product_uid || `PROD-${ulid()}`;

            await db.promise().query("UPDATE products SET url_token = ?, product_uid = ? WHERE id = ?", [url_token, product_uid, product.id]);
            console.log(`Updated product ${product.id}`);
        }

        console.log("All products updated successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
};

updateProducts();
