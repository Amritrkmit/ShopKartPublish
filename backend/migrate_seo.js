const path = require('path');
// Explicitly load .env from the current directory to be safe
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');

console.log("DEBUG: DB_HOST =", process.env.DB_HOST);
console.log("DEBUG: DB_USER =", process.env.DB_USER);
console.log("DEBUG: DB_NAME =", process.env.DB_NAME);

const queries = [
    // Products table
    `ALTER TABLE products ADD COLUMN meta_title VARCHAR(255) NULL`,
    `ALTER TABLE products ADD COLUMN meta_description TEXT NULL`,
    `ALTER TABLE products ADD COLUMN meta_keywords VARCHAR(255) NULL`,

    // Categories table
    `ALTER TABLE categories ADD COLUMN meta_title VARCHAR(255) NULL`,
    `ALTER TABLE categories ADD COLUMN meta_description TEXT NULL`,
    `ALTER TABLE categories ADD COLUMN meta_keywords VARCHAR(255) NULL`,

    // Subcategories table
    `ALTER TABLE subcategories ADD COLUMN meta_title VARCHAR(255) NULL`,
    `ALTER TABLE subcategories ADD COLUMN meta_description TEXT NULL`,
    `ALTER TABLE subcategories ADD COLUMN meta_keywords VARCHAR(255) NULL`
];

function runQuery(sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function runMigration() {
    console.log("Starting SEO migration...");

    for (const query of queries) {
        try {
            await runQuery(query);
            console.log(`Successfully executed: ${query.split('ADD COLUMN')[1]}`);
        } catch (error) {
            if (error && (error.code === 'ER_DUP_FIELDNAME' || error.errno === 1060)) {
                console.log(`Column already exists (skipped): ${query.split('ADD COLUMN')[1]}`);
            } else {
                console.error(`Error executing query: ${query}`);
                console.error("DETAILS:", error.message);
            }
        }
    }

    console.log("Migration completed.");
    process.exit();
}

runMigration();
