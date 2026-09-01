const express = require('express');
const router = express.Router();
const db = require('../db');
const { getNearbyShops, getShopsByPincodeOrCity } = require('../services/location_discovery');

/**
 * @route GET /api/shops/explore
 * @desc Discovery shops based on location or fallback
 */
router.get('/explore', async (req, res) => {
    const { lat, lng, radius, city, pincode } = req.query;

    console.log('🔍 Shop Discovery Request:', { lat, lng, radius, city, pincode });

    try {
        let shops = [];
        if (lat && lng) {
            console.log('📍 Using geolocation search...');
            shops = await getNearbyShops(parseFloat(lat), parseFloat(lng), parseFloat(radius) || 50);
            console.log(`✅ Found ${shops.length} nearby shops`);
        } else if (pincode || city) {
            console.log('🏙️ Using city/pincode search...');
            shops = await getShopsByPincodeOrCity(pincode, city);
            console.log(`✅ Found ${shops.length} shops by location`);
        } else {
            console.log('🌍 Using global fallback...');
            // Global fallback: Recent active shops
            const [rows] = await db.promise.execute(`
                SELECT s.id, s.name, s.slug, s.logo_url, s.city, s.pincode 
                FROM shops s
                JOIN sellers sel ON s.seller_id = sel.id
                WHERE s.is_active = 1 AND sel.status = 'APPROVED'
                ORDER BY s.created_at DESC
                LIMIT 20
            `);
            shops = rows;
            console.log(`✅ Found ${shops.length} fallback shops`);
        }

        console.log('📦 Returning shops:', shops.map(s => ({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude })));
        res.json({ success: true, shops });
    } catch (error) {
        console.error("❌ Discovery error:", error);
        res.status(500).json({ success: false, message: "Error discovering shops" });
    }
});

/**
 * @route GET /api/shops/:slug
 * @desc Get shop profile and its products
 */
router.get('/:slug', async (req, res) => {
    try {
        const [shops] = await db.promise.execute(`
            SELECT s.*, sel.business_name, sel.status as seller_status
            FROM shops s
            JOIN sellers sel ON s.seller_id = sel.id
            WHERE s.slug = ?
        `, [req.params.slug]);

        if (shops.length === 0) {
            return res.status(404).json({ success: false, message: "Shop not found" });
        }

        const shop = shops[0];

        // Check if shop is active and seller is approved
        if (shop.is_active === 0 || shop.seller_status !== 'APPROVED') {
            return res.status(403).json({
                success: false,
                message: "This shop is currently inactive or suspended",
                is_suspended: true
            });
        }

        // Fetch products for this shop
        const [products] = await db.promise.execute(`
            SELECT p.*, 
            c.name as category_name, sc.name as subcategory_name,
            (SELECT GROUP_CONCAT(pi.image_url) FROM product_images pi WHERE pi.product_id = p.id) as images
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
            WHERE p.shop_id = ? AND p.status = 'published'
        `, [shop.id]);

        res.json({ success: true, shop, products });
    } catch (error) {
        console.error("Shop detail error:", error);
        res.status(500).json({ success: false, message: "Error fetching shop details" });
    }
});

/**
 * @route GET /api/shops/:shopId/vibe
 * @desc Get aggregated Seller Vibe Score (Delivery & Packaging)
 */
router.get('/:shopId/vibe', async (req, res) => {
    const { shopId } = req.params;
    try {
        const query = `
            SELECT 
                AVG(r.delivery_rating) as avg_delivery,
                AVG(r.packaging_rating) as avg_packaging,
                COUNT(r.id) as total_vibe_reviews
            FROM reviews r
            JOIN products p ON r.product_id = p.id
            WHERE p.shop_id = ?
        `;
        const [rows] = await db.promise.execute(query, [shopId]);

        const vibe = rows[0];

        // Calculate an overall percentage "Vibe Score"
        const delivery = parseFloat(vibe.avg_delivery) || 5;
        const packaging = parseFloat(vibe.avg_packaging) || 5;
        const score = ((delivery + packaging) / 10) * 100;

        res.json({
            success: true,
            vibe: {
                score: Math.round(score),
                delivery: delivery.toFixed(1),
                packaging: packaging.toFixed(1),
                total_reviews: vibe.total_vibe_reviews
            }
        });
    } catch (error) {
        console.error("Vibe calculation error:", error);
        res.status(500).json({ success: false, message: "Error calculating vibe score" });
    }
});

module.exports = router;
