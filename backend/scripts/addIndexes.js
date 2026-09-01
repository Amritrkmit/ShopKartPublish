const mysql = require('mysql2/promise');
require('dotenv').config();

const addIndexes = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Adding indexes to optimize search and filters...');

        // Index for 'status' (freq filter)
        await connection.execute('ALTER TABLE products ADD INDEX idx_status (status)');

        // Index for 'brand'
        await connection.execute('ALTER TABLE products ADD INDEX idx_brand (brand)');

        // Index for 'created_at' (sorting)
        await connection.execute('ALTER TABLE products ADD INDEX idx_created_at (created_at)');

        // Index for 'shop_id' (already exists as idx_shop_id)

        // Fulltext index for name/description if user wants to fallback to MySQL FTS
        await connection.execute('ALTER TABLE products ADD FULLTEXT INDEX idx_fulltext_search (name, description, tags, brand)');

        console.log('✅ Performance indexes added successfully!');
    } catch (err) {
        if (err.code === 'ER_DUP_KEYNAME') {
            console.log('⚠️ Indexes already exist.');
        } else {
            console.error('❌ Error adding indexes:', err.message);
        }
    } finally {
        await connection.end();
    }
};

addIndexes();
