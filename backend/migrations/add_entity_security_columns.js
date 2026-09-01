require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');

const entities = ['categories', 'subcategories', 'brands', 'shops'];

async function runMigration() {
    console.log('🔒 Starting Entity Security Migration...');

    try {
        for (const table of entities) {
            console.log(`Checking table: ${table}...`);

            // Check column 'uid'
            const [cols] = await db.promise.query(`SHOW COLUMNS FROM ${table} LIKE 'uid'`);
            if (cols.length === 0) {
                console.log(`Adding 'uid' and 'url_token' to ${table}...`);
                await db.promise.query(`
          ALTER TABLE ${table} 
          ADD COLUMN uid VARCHAR(50) UNIQUE DEFAULT NULL AFTER id,
          ADD COLUMN url_token VARCHAR(255) UNIQUE DEFAULT NULL AFTER uid
        `);
            } else {
                console.log(`Columns already exist in ${table}.`);
            }
        }

        console.log('✅ Entity Security Migration Completed Successfully.');
    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        process.exit();
    }
}

runMigration();
