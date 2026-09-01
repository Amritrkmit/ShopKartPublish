require('dotenv').config();
const db = require('./db');

async function checkTables() {
    try {
        console.log('🔍 Checking database tables...');
        const [rows] = await db.promise.execute("SHOW TABLES");
        const tables = rows.map(r => Object.values(r)[0]);
        console.log('✅ Found tables:', tables.join(', '));
        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking tables:', error);
        process.exit(1);
    }
}

checkTables();
