const db = require('./backend/db');
require('dotenv').config({ path: './backend/.env' });

async function migrate() {
    try {
        console.log('Starting migration...');

        // Add cancellation_duration to products
        await db.promise.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS cancellation_duration INT DEFAULT 7,
      ADD COLUMN IF NOT EXISTS is_cancellable TINYINT(1) DEFAULT 1
    `);

        console.log('Column cancellation_duration and is_cancellable added to products table.');

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
