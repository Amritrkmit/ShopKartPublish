require('dotenv').config();
const db = require('./db');

async function checkShops() {
    try {
        console.log('🔍 Checking shops in database...\n');

        // Get all shops with their coordinates and seller status
        const [shops] = await db.promise.execute(`
            SELECT 
                s.id, s.name, s.city, s.pincode, 
                s.latitude, s.longitude, s.is_active,
                sel.status as seller_status,
                sel.business_name
            FROM shops s
            JOIN sellers sel ON s.seller_id = sel.id
            ORDER BY s.id
        `);

        console.log(`📊 Total shops found: ${shops.length}\n`);

        if (shops.length === 0) {
            console.log('❌ No shops found in database!');
            process.exit(0);
        }

        shops.forEach((shop, index) => {
            console.log(`\n--- Shop ${index + 1} ---`);
            console.log(`ID: ${shop.id}`);
            console.log(`Name: ${shop.name}`);
            console.log(`Business: ${shop.business_name}`);
            console.log(`City: ${shop.city}, Pincode: ${shop.pincode}`);
            console.log(`Coordinates: ${shop.latitude}, ${shop.longitude}`);
            console.log(`Is Active: ${shop.is_active}`);
            console.log(`Seller Status: ${shop.seller_status}`);

            // Check if this shop would be discoverable
            const isDiscoverable = shop.is_active === 1 &&
                shop.seller_status === 'APPROVED' &&
                shop.latitude !== null &&
                shop.longitude !== null;
            console.log(`✅ Discoverable: ${isDiscoverable ? 'YES' : 'NO'}`);

            if (!isDiscoverable) {
                const reasons = [];
                if (shop.is_active !== 1) reasons.push('Shop not active');
                if (shop.seller_status !== 'APPROVED') reasons.push(`Seller status: ${shop.seller_status}`);
                if (shop.latitude === null || shop.longitude === null) reasons.push('Missing coordinates');
                console.log(`   Reasons: ${reasons.join(', ')}`);
            }
        });

        // Test distance calculation for user's location
        const userLat = 25.11499403999999;
        const userLng = 84.31145476999997;
        const radius = 50;

        console.log(`\n\n🎯 Testing distance from user location: ${userLat}, ${userLng}`);
        console.log(`   Search radius: ${radius}km\n`);

        const [nearbyShops] = await db.promise.execute(`
            SELECT 
                s.id, s.name, s.latitude, s.longitude,
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

        console.log(`📍 Shops within ${radius}km: ${nearbyShops.length}`);
        nearbyShops.forEach(shop => {
            console.log(`   - ${shop.name}: ${shop.distance.toFixed(2)}km away`);
        });

        if (nearbyShops.length === 0) {
            console.log('\n⚠️ No shops found within radius. Calculating distances to all active shops:');
            const [allShops] = await db.promise.execute(`
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
                ORDER BY distance ASC
                LIMIT 5
            `, [userLat, userLng, userLat]);

            console.log('\n   Nearest 5 shops:');
            allShops.forEach(shop => {
                console.log(`   - ${shop.name} (${shop.city}): ${shop.distance.toFixed(2)}km away`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkShops();
