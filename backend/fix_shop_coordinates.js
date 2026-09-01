require('dotenv').config();
const db = require('./db');

async function fixShopCoordinates() {
    try {
        console.log('🔧 Fixing shop coordinates...\n');

        // Update the existing shop with correct coordinates for Gorari, Bihar
        // Gorari, Bihar (802214) is approximately at 25.5°N, 84.5°E
        const [result] = await db.promise.execute(`
            UPDATE shops 
            SET latitude = 25.5, longitude = 84.5 
            WHERE id = 1 AND city = 'Gorari' AND pincode = '802214'
        `);

        console.log(`✅ Updated ${result.affectedRows} shop(s)\n`);

        // Verify the update
        const [shops] = await db.promise.execute(`
            SELECT id, name, city, pincode, latitude, longitude 
            FROM shops 
            WHERE id = 1
        `);

        if (shops.length > 0) {
            const shop = shops[0];
            console.log('📍 Updated shop details:');
            console.log(`   Name: ${shop.name}`);
            console.log(`   Location: ${shop.city}, ${shop.pincode}`);
            console.log(`   Coordinates: ${shop.latitude}, ${shop.longitude}\n`);
        }

        // Test with user's location
        const userLat = 25.11499403999999;
        const userLng = 84.31145476999997;
        const radius = 50;

        console.log(`🎯 Testing nearby search from user location: ${userLat}, ${userLng}`);
        console.log(`   Search radius: ${radius}km\n`);

        const [nearbyShops] = await db.promise.execute(`
            SELECT 
                s.id, s.name, s.city, s.latitude, s.longitude,
                (6371 * acos(
                    cos(radians(?)) * cos(radians(s.latitude)) * 
                    cos(radians(s.longitude) - radians(?)) + 
                    sin(radians(?)) * sin(radians(s.latitude))
                )) AS distance
            FROM shops s
            JOIN sellers sel ON s.seller_id = sel.id
            WHERE s.is_active = 1 
              AND sel.status = 'APPROVED'
              AND s.latitude IS NOT NULL
              AND s.longitude IS NOT NULL
            HAVING distance < ?
            ORDER BY distance ASC
        `, [userLat, userLng, userLat, radius]);

        console.log(`✅ Shops found within ${radius}km: ${nearbyShops.length}`);
        nearbyShops.forEach(shop => {
            console.log(`   ✓ ${shop.name} (${shop.city}): ${shop.distance.toFixed(2)}km away`);
        });

        if (nearbyShops.length > 0) {
            console.log('\n🎉 SUCCESS! Nearby shops are now discoverable!');
        } else {
            console.log('\n⚠️ No shops found. May need to adjust coordinates further.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixShopCoordinates();
