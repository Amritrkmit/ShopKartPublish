const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../db');
const { ulid } = require('ulid');
const crypto = require('crypto');

const backfillProducts = async () => {
    try {
        console.log('Starting product backfill...');
        const [products] = await db.promise.query("SELECT id FROM products WHERE product_uid IS NULL OR url_token IS NULL");

        console.log(`Found ${products.length} products to backfill.`);

        for (const product of products) {
            const newUlid = `PROD-${ulid()}`;
            const newToken = crypto.randomBytes(64).toString('hex');

            await db.promise.query(
                "UPDATE products SET product_uid = ?, url_token = ? WHERE id = ?",
                [newUlid, newToken, product.id]
            );
            process.stdout.write('.');
        }

        console.log('\nProduct backfill completed.');
        process.exit(0);
    } catch (err) {
        console.error('\nBackfill failed:', err);
        process.exit(1);
    }
};

backfillProducts();
