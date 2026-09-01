
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function addExchangeWarrantyFields() {
    const queries = [
        `ALTER TABLE products ADD COLUMN exchange_available TINYINT(1) DEFAULT 0`,
        `ALTER TABLE products ADD COLUMN exchange_discount DECIMAL(10, 2) DEFAULT 0`,
        `ALTER TABLE products ADD COLUMN warranty VARCHAR(255) NULL`,
        `ALTER TABLE products ADD COLUMN warranty_details TEXT NULL`
    ];

    console.log('🔄 Adding Exchange & Warranty fields to products table...');

    for (const query of queries) {
        try {
            await db.promise.query(query);
            console.log(`✅ Success: ${query}`);
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log(`⚠️ Column already exists: ${query}`);
            } else {
                console.error(`❌ Error executing ${query}:`, err);
            }
        }
    }

    console.log('🎉 Migration complete!');
    process.exit();
}

addExchangeWarrantyFields();
