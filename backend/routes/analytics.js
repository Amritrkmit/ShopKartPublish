const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdminJWT = require('../middlewares/requireAdminJWT');
const redis = require('../utils/redis');
const { queueForHadoop } = require('../services/hadoopQueue'); // Hadoop queue integration

// Helper to get formatted cache key
const getCacheKey = (type, params) => `analytics:${type}:${JSON.stringify(params)}`;

// CACHE DURATION: 1 Hour
const CACHE_TTL = 3600;

// Track an event
router.post('/track', async (req, res) => {
    // ... existing track code ...
    // Note: Tracking invalidates cache? Or we just accept stale data for 1h?
    // For high volume, we usually don't invalidate on every write.
    // Ideally, we might want to invalidate 'stats' cache if it's super real-time, 
    // but typically analytics is okay being slightly delayed.

    // Original implementation below:
    const { visitor_id, page_url, event_type, event_data, user_id, ip_address, user_agent } = req.body;

    const query = `
        INSERT INTO analytics 
        (visitor_id, page_url, event_type, event_data, user_id, ip_address, user_agent) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [
        visitor_id,
        page_url,
        event_type || 'pageview',
        JSON.stringify(event_data || {}),
        user_id || null,
        ip_address || null,
        user_agent || null
    ], async (err, result) => {
        if (err) {
            console.error('Error tracking analytics:', err);
            return res.status(500).json({ error: 'Failed to track event' });
        }

        // Queue clickstream event for Hadoop ingestion (fire-and-forget, non-blocking)
        queueForHadoop('clickstream', {
            event_id: result.insertId,
            visitor_id,
            page_url,
            event_type: event_type || 'pageview',
            event_data: event_data || {},
            user_id: user_id || null,
            ip_address: ip_address || req.ip,
            user_agent: user_agent || req.headers['user-agent'],
            timestamp: new Date().toISOString()
        }).then(() => {
            console.log(`📤 Clickstream event queued for Hadoop ingestion`);
        }).catch(hadoopErr => {
            console.error('⚠️  Failed to queue clickstream for Hadoop:', hadoopErr.message);
            // Don't fail the request if Hadoop queue fails
        });

        res.status(200).json({ message: 'Event tracked' });
    });
});

// Clear Cache Endpoint
router.post('/cache/clear', requireAdminJWT, async (req, res) => {
    try {
        await redis.flush();
        res.json({ message: 'Analytics cache cleared successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to clear cache' });
    }
});

// Get Analytics Stats for Admin
router.get('/stats', requireAdminJWT, async (req, res) => {
    try {
        const cacheKey = getCacheKey('stats', {});
        const cachedFn = await redis.get(cacheKey);

        if (cachedFn) {
            return res.json(JSON.parse(cachedFn));
        }

        const stats = {};
        const promiseDb = db.promise;

        // 1. Total Visitors (Unique visitor_ids)
        const [visitorsRows] = await promiseDb.query("SELECT COUNT(DISTINCT visitor_id) as total_visitors FROM analytics");
        stats.total_visitors = visitorsRows[0].total_visitors;

        // 2. Total Page Views
        const [viewsRows] = await promiseDb.query("SELECT COUNT(*) as total_views FROM analytics WHERE event_type = 'pageview'");
        stats.total_views = viewsRows[0].total_views;

        // 3. User Behavior / Top Pages
        const [topPages] = await promiseDb.query(`
            SELECT page_url, COUNT(*) as views 
            FROM analytics 
            WHERE event_type = 'pageview' 
            GROUP BY page_url 
            ORDER BY views DESC 
            LIMIT 10
        `);
        stats.top_pages = topPages;

        // 4. Visitors Over Time (Last 7 Days)
        const [visitorsOverTime] = await promiseDb.query(`
            SELECT DATE(created_at) as date, COUNT(DISTINCT visitor_id) as visitors 
            FROM analytics 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        `);
        stats.visitors_over_time = visitorsOverTime;

        // 5. Calculate Conversion Rate (Orders / Unique Visitors)
        const [ordersRows] = await promiseDb.query("SELECT COUNT(*) as total_orders FROM orders");
        const totalOrders = ordersRows[0].total_orders;
        stats.conversion_rate = stats.total_visitors > 0 ? ((totalOrders / stats.total_visitors) * 100).toFixed(2) : 0;

        // Save to cache
        await redis.set(cacheKey, JSON.stringify(stats), { EX: CACHE_TTL });

        res.json(stats);

    } catch (err) {
        console.error('Error fetching analytics:', err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get Detailed Sales Analytics
router.get('/sales', requireAdminJWT, async (req, res) => {
    try {
        const { range } = req.query; // '7days', '30days', 'year', 'all'

        const cacheKey = getCacheKey('sales', { range });
        const cachedFn = await redis.get(cacheKey);
        if (cachedFn) return res.json(JSON.parse(cachedFn));

        const promiseDb = db.promise;

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

        // 1. Sales Over Time (Line Chart)
        const [salesOverTime] = await promiseDb.query(`
            SELECT DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as orders 
            FROM orders 
            ${dateCondition}
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        `);

        // 2. Fetch Orders for detailed aggregation
        const [orders] = await promiseDb.query(`
            SELECT id, items, total_amount, created_at 
            FROM orders 
            ${dateCondition}
        `);

        // Fetch Metadata maps
        const [products] = await promiseDb.query("SELECT id, name, category_id, subcategory_id, price, sale_price, attributes FROM products");
        const [categories] = await promiseDb.query("SELECT id, name FROM categories");
        const [subcategories] = await promiseDb.query("SELECT id, name FROM subcategories");

        const categoryMap = {};
        categories.forEach(c => categoryMap[c.id] = c.name);

        const subcategoryMap = {};
        subcategories.forEach(s => subcategoryMap[s.id] = s.name);

        const productMap = {};
        products.forEach(p => productMap[p.id] = p);

        // Aggregators
        const categorySales = {};
        const brandSales = {};
        let offerZoneRevenue = 0;
        let totalRevenue = 0;

        orders.forEach(order => {
            let items = [];
            if (typeof order.items === 'string') {
                try { items = JSON.parse(order.items); } catch (e) { }
            } else if (Array.isArray(order.items)) {
                items = order.items;
            }

            items.forEach(item => {
                // Prioritize product_id over id as 'id' in snapshot might be line item ID
                const product = productMap[item.product_id || item.id];
                if (!product) return;

                const lineTotal = (parseFloat(item.price) * (item.quantity || 1));

                // Category Aggregation
                const catName = categoryMap[product.category_id] || 'Uncategorized';
                categorySales[catName] = (categorySales[catName] || 0) + lineTotal;

                // Brand/Subcategory Aggregation - Enhanced Brand Detection
                let brandName = subcategoryMap[product.subcategory_id];

                // 1. Try to find Brand in attributes
                if (product.attributes) {
                    try {
                        const attrs = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes;
                        const detectedBrand = attrs.Brand || attrs.brand || attrs.Manufacturer || attrs.manufacturer;
                        if (detectedBrand) {
                            brandName = Array.isArray(detectedBrand) ? detectedBrand[0] : detectedBrand;
                        }
                    } catch (e) { }
                }

                // 2. Final Fallback
                if (!brandName) brandName = 'Generic';

                brandSales[brandName] = (brandSales[brandName] || 0) + lineTotal;

                // Offer Zone Check
                if (product.sale_price && parseFloat(product.sale_price) < parseFloat(product.price)) {
                    offerZoneRevenue += lineTotal;
                }
            });

            totalRevenue += parseFloat(order.total_amount);
        });

        // Format for Charts
        const salesByCategory = Object.entries(categorySales)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const salesByBrand = Object.entries(brandSales)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const result = {
            sales_over_time: salesOverTime,
            sales_by_category: salesByCategory,
            sales_by_brand: salesByBrand,
            offer_zone_revenue: offerZoneRevenue,
            total_revenue: totalRevenue,
            total_orders: orders.length
        };

        await redis.set(cacheKey, JSON.stringify(result), { EX: CACHE_TTL });
        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// Funnel Analysis (Visitor Journey)
router.get('/funnel', requireAdminJWT, async (req, res) => {
    try {
        const { range } = req.query; // '7days', '30days'

        const cacheKey = getCacheKey('funnel', { range });
        const cachedFn = await redis.get(cacheKey);
        if (cachedFn) return res.json(JSON.parse(cachedFn));

        let dateCondition = "";
        const promiseDb = db.promise;

        if (range === '7days') dateCondition = "AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        else if (range === '30days') dateCondition = "AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        else if (range === 'year') dateCondition = "AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";

        // VISITOR COUNT
        const [visitors] = await promiseDb.query(`
            SELECT COUNT(DISTINCT visitor_id) as count 
            FROM analytics 
            WHERE 1=1 ${dateCondition}
        `);

        // PRODUCT VIEW COUNT
        const [productViews] = await promiseDb.query(`
            SELECT COUNT(DISTINCT visitor_id) as count 
            FROM analytics 
            WHERE page_url LIKE '/product/%' ${dateCondition}
        `);

        // ADD TO CART COUNT
        const [cartStep] = await promiseDb.query(`
            SELECT COUNT(DISTINCT visitor_id) as count 
            FROM analytics 
            WHERE (event_type = 'add_to_cart' OR page_url = '/cart') ${dateCondition}
        `);

        // CHECKOUT INITIATED
        const [checkout] = await promiseDb.query(`
            SELECT COUNT(DISTINCT visitor_id) as count 
            FROM analytics 
            WHERE page_url = '/checkout' ${dateCondition}
        `);

        // PURCHASED
        const [purchase] = await promiseDb.query(`
            SELECT COUNT(DISTINCT visitor_id) as count 
            FROM analytics 
            WHERE event_type = 'purchase' ${dateCondition}
        `);

        const result = [
            { stage: 'Visitors', count: visitors[0].count, fill: '#8884d8' },
            { stage: 'Product View', count: productViews[0].count, fill: '#83a6ed' },
            { stage: 'Add to Cart', count: cartStep[0].count, fill: '#8dd1e1' },
            { stage: 'Checkout', count: checkout[0].count, fill: '#82ca9d' },
            { stage: 'Purchase', count: purchase[0].count, fill: '#a4de6c' },
        ];

        await redis.set(cacheKey, JSON.stringify(result), { EX: CACHE_TTL });
        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ meessage: "Server Error" });
    }
});

// Location Analytics
router.get('/location', requireAdminJWT, async (req, res) => {
    try {
        const { range } = req.query;

        const cacheKey = getCacheKey('location', { range });
        const cachedFn = await redis.get(cacheKey);
        if (cachedFn) return res.json(JSON.parse(cachedFn));

        const promiseDb = db.promise;
        let dateCondition = "";

        const intervalMap = {
            '7days': 'INTERVAL 7 DAY',
            '30days': 'INTERVAL 30 DAY',
            'year': 'INTERVAL 1 YEAR',
            'all': null
        };

        if (range && intervalMap[range]) {
            dateCondition = `AND created_at >= DATE_SUB(CURDATE(), ${intervalMap[range]})`;
        }

        // Fetch raw order data including address and status
        const [orders] = await promiseDb.query(`
            SELECT id, total_amount, shipping_address, payment_id, status, created_at 
            FROM orders 
            WHERE shipping_address IS NOT NULL ${dateCondition}
        `);

        const stateStats = {};

        orders.forEach(order => {
            const addr = order.shipping_address;
            if (!addr) return;

            const parts = addr.split(',');
            let state = 'Unknown';
            if (parts.length > 0) {
                state = parts[parts.length - 1].trim();
            }
            state = state.toUpperCase();

            if (!stateStats[state]) {
                stateStats[state] = {
                    state: state,
                    orders: 0,
                    revenue: 0,
                    cod_orders: 0,
                    cod_failures: 0
                };
            }

            stateStats[state].orders += 1;
            stateStats[state].revenue += parseFloat(order.total_amount);

            // COD Analysis
            const isCOD = order.payment_id && order.payment_id.startsWith('COD_');
            if (isCOD) {
                stateStats[state].cod_orders += 1;
                if (order.status === 'cancelled' || order.status === 'returned') {
                    stateStats[state].cod_failures += 1;
                }
            }
        });

        const statsArray = Object.values(stateStats);
        const topStates = [...statsArray].sort((a, b) => b.orders - a.orders).slice(0, 10);
        const topRevenueStates = [...statsArray].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
        const codRiskStates = [...statsArray]
            .filter(s => s.cod_orders >= 5)
            .map(s => ({ ...s, failure_rate: (s.cod_failures / s.cod_orders * 100).toFixed(1) }))
            .sort((a, b) => b.failure_rate - a.failure_rate);

        const result = {
            top_states: topStates,
            top_revenue: topRevenueStates,
            cod_risk: codRiskStates
        };

        await redis.set(cacheKey, JSON.stringify(result), { EX: CACHE_TTL });
        res.json(result);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

// 6. Product Performance Analytics
router.get('/products', requireAdminJWT, async (req, res) => {
    try {
        const { range } = req.query; // '7days', '30days', 'year', 'all'
        const cacheKey = getCacheKey('products', { range });
        const cachedData = await redis.get(cacheKey);

        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const promiseDb = db.promise;

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

        // Fetch all products (to ensure we know about products with 0 sales)
        const [allProducts] = await promiseDb.query("SELECT id, name, stock, track_inventory FROM products");

        // Fetch orders within range
        const [orders] = await promiseDb.query(`
            SELECT items, status 
            FROM orders 
            ${dateCondition}
        `);

        // Aggregation Map
        const productStats = {}; // { id: { name, sales: 0, stock: 0 ... } }

        // Initialize with all products
        allProducts.forEach(p => {
            productStats[p.id] = {
                id: p.id,
                name: p.name,
                stock: p.stock || 0,
                track_inventory: p.track_inventory,
                sales: 0,
                revenue: 0,
                returns: 0
            };
        });

        // Process Orders
        orders.forEach(order => {
            let items = [];
            try {
                items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            } catch (e) { console.error("JSON Parse Error", e); }

            if (!Array.isArray(items)) return;

            items.forEach(item => {
                const pid = item.product_id || item.id; // Prioritize product_id for snapshot accuracy
                if (productStats[pid]) {
                    // Count Sales
                    if (order.status !== 'cancelled' && order.status !== 'failed' && order.status !== 'returned') {
                        productStats[pid].sales += (item.quantity || 1);
                        productStats[pid].revenue += ((item.price || 0) * (item.quantity || 1));
                    }
                    // Count Returns
                    if (order.status === 'returned' || order.status === 'cancelled') {
                        productStats[pid].returns += (item.quantity || 1);
                    }
                }
            });
        });

        // Convert to Array, calculate rates, and Sort
        const productsArray = Object.values(productStats).map(p => {
            const total = p.sales + p.returns;
            return {
                ...p,
                return_rate: total > 0 ? parseFloat(((p.returns / total) * 100).toFixed(1)) : 0
            };
        });

        const response = {
            top_selling: [...productsArray].sort((a, b) => b.sales - a.sales || b.revenue - a.revenue).slice(0, 5),
            // Worst performing: Low sales but has stock (Dead Stock priority)
            worst_performing: [...productsArray]
                .filter(p => p.sales < 5)
                .sort((a, b) => a.sales - b.sales || b.stock - a.stock)
                .slice(0, 5),
            // Priority: Low stock products that actually sell (Threshold changed to 10)
            low_stock: productsArray
                .filter(p => p.stock > 0 && p.stock <= 10)
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 10),
            // Priority: Out of stock products with high historical demand in this range
            out_of_stock: productsArray
                .filter(p => p.stock === 0)
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 10),
            // High Returns sorted by Rate (Percentage) for better insight
            high_return: [...productsArray]
                .filter(p => p.returns > 0)
                .sort((a, b) => b.return_rate - a.return_rate || b.returns - a.returns)
                .slice(0, 5)
        };

        // Cache 1 Hour
        redis.set(cacheKey, JSON.stringify(response), { EX: 3600 });

        res.json(response);

    } catch (error) {
        console.error("Product Analytics Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
