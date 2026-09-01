require('dotenv').config({ path: './backend/.env' });
const db = require('./backend/db');

async function test() {
    const promiseDb = db.promise;
    const range = '30days'; // Default

    let dateCondition = "WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";

    const [allProducts] = await promiseDb.query("SELECT id, name, stock, track_inventory FROM products");
    const [orders] = await promiseDb.query(`
        SELECT items, status 
        FROM orders 
        ${dateCondition}
    `);

    const productStats = {};
    allProducts.forEach(p => {
        productStats[p.id] = {
            id: p.id,
            name: p.name,
            stock: p.stock || 0,
            track_inventory: p.track_inventory,
            sales: 0,
            revenue: 0,
            returns: 0
        };
    });

    orders.forEach(order => {
        let items = [];
        try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch (e) { }
        if (!Array.isArray(items)) return;

        items.forEach(item => {
            const pid = item.product_id || item.id;
            if (productStats[pid]) {
                if (order.status !== 'cancelled' && order.status !== 'failed' && order.status !== 'returned') {
                    productStats[pid].sales += (item.quantity || 1);
                }
            }
        });
    });

    const productsArray = Object.values(productStats);
    const out_of_stock = productsArray
        .filter(p => p.track_inventory && p.stock === 0)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);

    console.log("Out of Stock Count:", out_of_stock.length);
    console.log("Out of Stock Items:", JSON.stringify(out_of_stock, null, 2));
    process.exit();
}

test();
