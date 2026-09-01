require('dotenv').config();
const db = require('./db');

// Simple geocoding function (same as in sellers.js)
function estimateCoordinates(city, pincode) {
    const baseLat = 20.5937;
    const baseLng = 78.9629;
    const hash = (pincode || city || "").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((hash % 2000) - 1000) / 100;
    const lngOffset = ((hash % 3000) - 1500) / 100;
    return {
        latitude: baseLat + latOffset,
        longitude: baseLng + lngOffset
    };
}

async function updateShopCoordinates() {
    try {
        // Get all shops without coordinates
        const [shops] = await db.promise.execute(`
            SELECT id, city, pincode, name 
            FROM shops 
            WHERE (latitude IS NULL OR longitude IS NULL) 
            AND city IS NOT NULL
        `);

        console.log(`Found ${shops.length} shops needing coordinates`);

        for (const shop of shops) {
            const coords = estimateCoordinates(shop.city, shop.pincode);
            await db.promise.execute(
                'UPDATE shops SET latitude = ?, longitude = ?, is_active = 1 WHERE id = ?',
                [coords.latitude, coords.longitude, shop.id]
            );
            console.log(`✅ Updated ${shop.name}: lat=${coords.latitude}, lng=${coords.longitude}`);
        }

        console.log('✨ All shops updated!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateShopCoordinates();
