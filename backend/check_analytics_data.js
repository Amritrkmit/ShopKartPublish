const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAnalyticsData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reactwebsiteapp'
    });

    try {
        const [rows] = await connection.query('SELECT event_type, COUNT(*) as count FROM analytics GROUP BY event_type');
        console.log('--- EVENT TYPES ---');
        rows.forEach(r => console.log(`${r.event_type}: ${r.count}`));

        const [recent] = await connection.query('SELECT event_type, page_url, created_at FROM analytics ORDER BY created_at DESC LIMIT 5');
        console.log('--- RECENT PAGEVIEWS ---');
        recent.forEach(r => console.log(`${r.created_at} | ${r.event_type} | ${r.page_url}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkAnalyticsData();
