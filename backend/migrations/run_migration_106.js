const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');

const migrate = async () => {
    try {
        console.log('Starting migration...');

        // Add columns if they don't exist
        // MySQL 5.7+ supports IF NOT EXISTS for columns in ALTER TABLE in some versions, but standard MySQL often requires checking or just ignoring error 1060 (Duplicate column name)

        // Attempt to add order_id
        try {
            await db.promise.query(`ALTER TABLE orders ADD COLUMN order_id VARCHAR(50) UNIQUE AFTER id;`);
            console.log('Added order_id column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('order_id column already exists.');
            } else {
                console.error('Error adding order_id:', e);
            }
        }

        // Attempt to add url_token
        try {
            await db.promise.query(`ALTER TABLE orders ADD COLUMN url_token VARCHAR(255) UNIQUE AFTER order_id;`); // 64 bytes hex is 128 chars, 512 bits is 64 bytes. 255 is safe.
            console.log('Added url_token column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('url_token column already exists.');
            } else {
                console.error('Error adding url_token:', e);
            }
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
