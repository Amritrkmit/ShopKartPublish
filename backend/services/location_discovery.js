const db = require('../db');

/**
 * Find shops nearby a location using the Haversine formula + Bounding Box optimization
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Search radius in kilometers
 */
async function getNearbyShops(lat, lng, radiusKm = 50) {
    console.log(`🔍 getNearbyShops called with: lat=${lat}, lng=${lng}, radius=${radiusKm}km`);

    // Bounding box calculation for indexing optimization
    const kmPerDegreeLat = 111;
    const kmPerDegreeLng = 111 * Math.cos(lat * Math.PI / 180);

    const latDelta = radiusKm / kmPerDegreeLat;
    const lngDelta = radiusKm / kmPerDegreeLng;

    console.log(`📐 Bounding box: lat ${lat - latDelta} to ${lat + latDelta}, lng ${lng - lngDelta} to ${lng + lngDelta}`);

    const query = `
        SELECT 
            s.id, s.name, s.slug, s.logo_url, s.city, s.pincode, s.latitude, s.longitude,
            s.is_active, sel.status as seller_status,
            (6371 * acos(
                cos(radians(?)) * cos(radians(s.latitude)) * 
                cos(radians(s.longitude) - radians(?)) + 
                sin(radians(?)) * sin(radians(s.latitude))
            )) AS distance
        FROM shops s
        JOIN sellers sel ON s.seller_id = sel.id
        WHERE s.is_active = 1 
          AND sel.status = 'APPROVED'
          AND s.latitude BETWEEN ? AND ?
          AND s.longitude BETWEEN ? AND ?
          AND s.latitude IS NOT NULL
          AND s.longitude IS NOT NULL
        HAVING distance < ?
        ORDER BY distance ASC
        LIMIT 20;
    `;

    try {
        const [rows] = await db.promise.execute(query, [
            lat, lng, lat,
            lat - latDelta, lat + latDelta,
            lng - lngDelta, lng + lngDelta,
            radiusKm
        ]);
        console.log(`✅ Query returned ${rows.length} shops:`, rows.map(r => ({
            name: r.name,
            lat: r.latitude,
            lng: r.longitude,
            distance: r.distance,
            active: r.is_active,
            seller_status: r.seller_status
        })));
        return rows;
    } catch (error) {
        console.error("❌ Error fetching nearby shops:", error);
        throw error;
    }
}

/**
 * Fallback search when geolocation is unavailable
 */
async function getShopsByPincodeOrCity(pincode, city) {
    const query = `
        SELECT s.id, s.name, s.slug, s.logo_url, s.city, s.pincode
        FROM shops s
        JOIN sellers sel ON s.seller_id = sel.id
        WHERE (s.pincode = ? OR s.city = ?) 
          AND s.is_active = 1
          AND sel.status = 'APPROVED'
        ORDER BY s.created_at DESC
        LIMIT 20;
    `;
    const [rows] = await db.promise.execute(query, [pincode, city]);
    return rows;
}

module.exports = { getNearbyShops, getShopsByPincodeOrCity };
