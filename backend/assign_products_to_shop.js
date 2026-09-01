require('dotenv').config();
const db = require('./db');

async function assignProductsToShop() {
    try {
        // Get the first active shop (yours)
        const [shops] = await db.promise.execute(`
            SELECT id, name, seller_id 
            FROM shops 
            WHERE is_active = 1 
            LIMIT 1
        `);

        if (shops.length === 0) {
            console.log('❌ No active shop found');
            process.exit(1);
        }

        const shop = shops[0];
        console.log(`🏪 Found shop: ${shop.name} (ID: ${shop.id})`);

        // Count products without shop_id
        const [countResult] = await db.promise.execute(`
            SELECT COUNT(*) as count 
            FROM products 
            WHERE shop_id IS NULL
        `);

        const productsToUpdate = countResult[0].count;
        console.log(`📦 Found ${productsToUpdate} products without shop_id`);

        if (productsToUpdate === 0) {
            console.log('✅ All products already have shop_id assigned');
            process.exit(0);
        }

        // Assign all products without shop_id to this shop
        const [result] = await db.promise.execute(`
            UPDATE products 
            SET shop_id = ? 
            WHERE shop_id IS NULL
        `, [shop.id]);

        console.log(`✅ Updated ${result.affectedRows} products with shop_id = ${shop.id}`);
        console.log('✨ Done!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

assignProductsToShop();
