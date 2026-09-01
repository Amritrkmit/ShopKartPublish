const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');
const { ulid } = require('ulid');
const crypto = require('crypto');

const backfill = async () => {
    try {
        console.log('Starting backfill...');
        const [orders] = await db.promise.query("SELECT id FROM orders WHERE order_id IS NULL OR url_token IS NULL");

        console.log(`Found ${orders.length} orders to backfill.`);

        for (const order of orders) {
            const newUlid = `ORD-${ulid()}`;
            const newToken = crypto.randomBytes(64).toString('hex');

            await db.promise.query(
                "UPDATE orders SET order_id = ?, url_token = ? WHERE id = ?",
                [newUlid, newToken, order.id]
            );
            process.stdout.write('.');
        }

        console.log('\nBackfill completed.');
        process.exit(0);
    } catch (err) {
        console.error('\nBackfill failed:', err);
        process.exit(1);
    }
};

backfill();
