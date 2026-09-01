const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const db = require('./db');
const promiseDb = db.promise;

const runDebug = async () => {
    try {
        console.log("Starting Debug...");
        const range = '30days';
        let dateCondition = "";
        const intervalMap = {
            '7days': 'INTERVAL 7 DAY',
            '30days': 'INTERVAL 30 DAY',
            'year': 'INTERVAL 1 YEAR',
            'all': null
        };

        if (range && intervalMap[range]) {
            dateCondition = `WHERE created_at >= DATE_SUB(CURDATE(), ${intervalMap[range]})`;
        }

        console.log("Querying orders with condition:", dateCondition);

        const [orders] = await promiseDb.query(`
            SELECT id, items, total_amount, created_at 
            FROM orders 
            ${dateCondition}
        `);
        console.log(`Found ${orders.length} orders.`);

        if (orders.length > 0) {
            console.log("Sample Order Items (raw):", orders[0].items, "Type:", typeof orders[0].items);
        }

        const [products] = await promiseDb.query("SELECT id, name, category_id, subcategory_id, price, sale_price, old_price FROM products");
        console.log(`Found ${products.length} products.`);

        const [categories] = await promiseDb.query("SELECT id, name FROM categories");
        const [subcategories] = await promiseDb.query("SELECT id, name FROM subcategories");

        const categoryMap = {};
        categories.forEach(c => categoryMap[c.id] = c.name);

        const subcategoryMap = {};
        subcategories.forEach(s => subcategoryMap[s.id] = s.name);

        const productMap = {};
        products.forEach(p => productMap[p.id] = p);

        console.log("Processing orders...");
        orders.forEach((order, idx) => {
            let items = [];
            if (typeof order.items === 'string') {
                try {
                    items = JSON.parse(order.items);
                } catch (e) {
                    console.error(`Failed to parse items for order ${order.id}:`, e);
                }
            } else if (Array.isArray(order.items)) {
                items = order.items;
            } else if (typeof order.items === 'object' && order.items !== null) {
                // It might be a JSON object from mysql2
                items = [order.items]; // Or is it an object of items? Usually it's an array.
                if (Array.isArray(order.items)) items = order.items;
                else console.log(`Order ${order.id} items is object but not array:`, order.items);
            }

            console.log(`Order ${order.id} parsed items:`, items);

            items.forEach(item => {
                if (!item) return;
                const productId = item.id || item.product_id;
                console.log(`  - Item Product ID: ${productId}`);

                const product = productMap[productId];
                if (!product) {
                    console.log(`  - Product ${productId} not found in map.`);
                    return;
                }

                // Logic check
                const lineTotal = (parseFloat(item.price) * (item.quantity || 1));
                console.log(`  - Line Total: ${lineTotal}`);
            });
        });

        console.log("Finished successfully");
        process.exit(0);

    } catch (err) {
        console.error("CRASHED:", err);
        process.exit(1);
    }
};

runDebug();
