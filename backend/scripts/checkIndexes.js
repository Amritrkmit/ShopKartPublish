const mysql = require('mysql2/promise');
require('dotenv').config();

const checkIndexes = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [indexes] = await connection.execute('SHOW INDEX FROM products');
        console.log('--- Indexes on products table ---');
        console.table(indexes.map(idx => ({
            Table: idx.Table,
            Non_unique: idx.Non_unique,
            Key_name: idx.Key_name,
            Column_name: idx.Column_name,
            Type: idx.Index_type
        })));
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
};

checkIndexes();
