const mysql = require('mysql2/promise');
require('dotenv').config();

const checkTableSize = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM products');
        console.log('Total products:', rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
};

checkTableSize();
