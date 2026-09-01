const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reactwebsiteapp'
    });

    try {
        console.log('Altering event_logs table...');
        await connection.query('ALTER TABLE event_logs MODIFY email varchar(255) NULL');
        await connection.query('ALTER TABLE event_logs MODIFY username varchar(255) NULL');
        console.log('Table altered successfully.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

fixTable();
