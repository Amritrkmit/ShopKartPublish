require('dotenv').config({ path: './backend/.env' }); // Adjust path if needed
const db = require('../db');

const up = async () => {
    try {
        const query = `
            ALTER TABLE products 
            ADD COLUMN highlights JSON DEFAULT NULL,
            ADD COLUMN offers JSON DEFAULT NULL,
            ADD COLUMN payment_options JSON DEFAULT NULL,
            ADD COLUMN specifications JSON DEFAULT NULL;
        `;

        await db.promise.query(query);
        console.log('✅ Migration successful: Added dynamic content columns to products table');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('ℹ️ Columns already exist, skipping migration');
        } else {
            console.error('❌ Migration failed:', err);
            process.exit(1);
        }
    }
    process.exit(0);
};

up();
