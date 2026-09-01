require('dotenv').config();
const db = require('./db');

async function checkProducts() {
    try {
        const [products] = await db.promise.execute('SELECT id, name, shop_id FROM products LIMIT 20');
        console.log('Products:', JSON.stringify(products, null, 2));

        const [shops] = await db.promise.execute('SELECT id, name, seller_id FROM shops');
        console.log('Shops:', JSON.stringify(shops, null, 2));

        const [sellers] = await db.promise.execute('SELECT id, user_id FROM sellers');
        console.log('Sellers:', JSON.stringify(sellers, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkProducts();
