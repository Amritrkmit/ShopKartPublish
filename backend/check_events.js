const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkEvents() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reactwebsiteapp'
    });

    try {
        const [rows] = await connection.query('SELECT COUNT(*) as total, SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as guest_events FROM event_logs');
        console.log('--- START STATS ---');
        console.log(JSON.stringify(rows[0]));
        console.log('--- END STATS ---');

        const [structure] = await connection.query('DESCRIBE event_logs');
        console.log('--- START STRUCTURE ---');
        structure.forEach(col => {
            console.log(`${col.Field}: Null=${col.Null}, Type=${col.Type}`);
        });
        console.log('--- END STRUCTURE ---');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

checkEvents();
