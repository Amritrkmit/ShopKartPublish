const mysql = require('mysql2/promise');
require('dotenv').config();

const updateSchema = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding is_assured column to products table...');
        await connection.execute('ALTER TABLE products ADD COLUMN is_assured BOOLEAN DEFAULT FALSE');
        console.log('✅ Column added successfully!');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('⚠️ Column already exists.');
        } else {
            console.error('❌ Error updating schema:', err.message);
        }
    } finally {
        await connection.end();
    }
};

updateSchema();
