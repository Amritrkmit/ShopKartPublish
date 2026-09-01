const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

const runMigration = async () => {
    try {
        console.log('Running migration: Adding product_uid and url_token to products table...');

        // Add columns if they don't exist
        await db.promise.query(`
            ALTER TABLE products
            ADD COLUMN IF NOT EXISTS product_uid VARCHAR(50) UNIQUE AFTER id,
            ADD COLUMN IF NOT EXISTS url_token VARCHAR(255) UNIQUE AFTER product_uid
        `);

        console.log('Columns added successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

runMigration();
