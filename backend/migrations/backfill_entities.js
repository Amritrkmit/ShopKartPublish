require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');
const { ulid } = require('ulid');
const crypto = require('crypto');

const entities = [
    { table: 'categories', prefix: 'CAT' },
    { table: 'subcategories', prefix: 'SUB' },
    { table: 'brands', prefix: 'BRD' },
    { table: 'shops', prefix: 'SHP' }
];

async function backfillEntities() {
    console.log('🔄 Starting Entity Backfill...');

    try {
        for (const { table, prefix } of entities) {
            console.log(`Processing ${table}...`);

            const [rows] = await db.promise.query(`SELECT id FROM ${table} WHERE uid IS NULL OR url_token IS NULL`);

            if (rows.length === 0) {
                console.log(`✅ No backfill needed for ${table}.`);
                continue;
            }

            console.log(`Found ${rows.length} ${table} to backfill.`);

            for (const row of rows) {
                const uid = `${prefix}-${ulid()}`;
                const token = crypto.randomBytes(64).toString('hex');

                await db.promise.query(`UPDATE ${table} SET uid = ?, url_token = ? WHERE id = ?`, [uid, token, row.id]);
                process.stdout.write('.');
            }
            console.log(`\nDone with ${table}.`);
        }

        console.log('✅ All Entities Backfilled Successfully.');
    } catch (err) {
        console.error('❌ Backfill Failed:', err);
    } finally {
        process.exit();
    }
}

backfillEntities();
