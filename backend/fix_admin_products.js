require('dotenv').config();
const db = require('./db');

async function fixAdminProducts() {
    try {
        console.log('🔧 Fixing admin products...');

        // Set shop_id to NULL for all products
        // (Admin products should have shop_id = NULL)
        const [result] = await db.promise.execute(`
            UPDATE products 
            SET shop_id = NULL
        `);

        console.log(`✅ Reset ${result.affectedRows} products (shop_id set to NULL)`);
        console.log('📝 Admin products will now show in admin panel only');
        console.log('📝 Seller products uploaded via seller dashboard will have shop_id automatically');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixAdminProducts();
