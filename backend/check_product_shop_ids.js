require('dotenv').config();
const db = require('./db');

async function checkProductShopIds() {
    try {
        // Get all shops
        const [shops] = await db.promise.execute(`
            SELECT id, name, seller_id 
            FROM shops
        `);

        console.log('🏪 Shops in database:');
        shops.forEach(shop => {
            console.log(`  - Shop ID ${shop.id}: ${shop.name} (Seller ID: ${shop.seller_id})`);
        });

        // Get product distribution by shop_id
        const [distribution] = await db.promise.execute(`
            SELECT 
                shop_id,
                COUNT(*) as product_count,
                GROUP_CONCAT(DISTINCT name SEPARATOR ', ') as sample_products
            FROM products
            GROUP BY shop_id
        `);

        console.log('\n📦 Product distribution:');
        distribution.forEach(row => {
            console.log(`  - shop_id ${row.shop_id || 'NULL'}: ${row.product_count} products`);
            console.log(`    Sample: ${row.sample_products.substring(0, 100)}...`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkProductShopIds();
