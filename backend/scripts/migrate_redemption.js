const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shopkart_db'
});

const queries = [
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS redeemed_points INT DEFAULT 0 AFTER coupon_discount;",
];

async function runMigrations() {
    console.log("Starting production migrations for SuperCoin Redemption...");

    for (const query of queries) {
        try {
            console.log(`Executing: ${query}`);
            await db.promise().query(query);
            console.log("Success!");
        } catch (err) {
            if (err.code === 'ER_P_D_COLUMN_EXISTS' || err.code === 'ER_DUP_FIELDNAME') {
                console.log("Column already exists, skipping...");
            } else {
                console.error(`Error executing query: ${query}`);
                console.error(err);
            }
        }
    }

    console.log("Migrations complete!");
    process.exit(0);
}

runMigrations();
