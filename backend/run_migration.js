// Run this script to add coupon columns to orders table
// Usage: node run_migration.js

require('dotenv').config();
const db = require('./db');

const migration = `
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS coupon_discount DECIMAL(10, 2) DEFAULT 0
`;

// For MySQL that doesn't support IF NOT EXISTS in ALTER, we'll check first
async function runMigration() {
    console.log('Checking if coupon columns exist...');

    try {
        // Check if column exists by trying a query
        const [columns] = await db.promise.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'orders' 
            AND COLUMN_NAME = 'coupon_code'
        `);

        if (columns.length > 0) {
            console.log('✓ Coupon columns already exist!');
            process.exit(0);
        }

        console.log('Adding coupon_code and coupon_discount columns to orders table...');

        await db.promise.query(`
            ALTER TABLE orders
            ADD COLUMN coupon_code VARCHAR(50) NULL AFTER payment_status,
            ADD COLUMN coupon_discount DECIMAL(10, 2) DEFAULT 0 AFTER coupon_code
        `);

        console.log('✓ Migration successful! Coupon columns added.');
        process.exit(0);

    } catch (err) {
        console.error('✗ Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
