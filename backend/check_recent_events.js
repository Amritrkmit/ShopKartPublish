const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRecentEvents() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reactwebsiteapp'
    });

    try {
        const [rows] = await connection.query('SELECT * FROM event_logs ORDER BY created_at DESC LIMIT 5');
        console.log('--- RECENT EVENTS ---');
        console.table(rows);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkRecentEvents();
