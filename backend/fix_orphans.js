const path = require('path');
require("dotenv").config({ path: path.join(__dirname, ".env") });
const db = require("./db");

async function fixProducts() {
    try {
        console.log("🛠️ Fixing orphaned products...");

        // 1. Get the first shop ID (assuming single seller env for now)
        const [shops] = await db.promise.query("SELECT id FROM shops LIMIT 1");
        if (shops.length === 0) {
            console.log("❌ No shops found!");
            process.exit(1);
        }
        const shopId = shops[0].id; // Likely 1
        console.log(`✅ Default shop ID is: ${shopId}`);

        // 2. Count orphans (shop_id = 0 or NULL)
        const [count] = await db.promise.query("SELECT COUNT(*) as c FROM products WHERE shop_id = 0 OR shop_id IS NULL");
        console.log(`🔍 Found ${count[0].c} orphaned products.`);

        // 3. Update them
        if (count[0].c > 0) {
            const [update] = await db.promise.query("UPDATE products SET shop_id = ? WHERE shop_id = 0 OR shop_id IS NULL", [shopId]);
            console.log(`✅ Fixed! Updated ${update.affectedRows} products to belong to shop ${shopId}.`);
        } else {
            console.log("✨ No products needed fixing.");
        }

        process.exit();
    } catch (e) {
        console.error("❌ Error:", e);
        process.exit(1);
    }
}

fixProducts();
