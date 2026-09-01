const { promise: promisePool } = require('./db');

async function investigate() {
    try {
        console.log('--- Order #19 ---');
        const [orders] = await promisePool.query('SELECT * FROM orders WHERE id = 19');
        console.log(JSON.stringify(orders[0], null, 2));

        console.log('\n--- Product: Xiaomi 14 CIVI ---');
        const [products] = await promisePool.query("SELECT * FROM products WHERE name LIKE '%Xiaomi 14 CIVI%'");
        console.log(JSON.stringify(products, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

investigate();
