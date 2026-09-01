const express = require("express");
const router = express.Router();
const db = require("../db");
const requireSeller = require("../middlewares/requireSeller");
const multer = require("multer");
const path = require("path");
const { calculateItemFees } = require("../utils/sellerFees");

// Multer config for shop logo/banner
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/sellers/");
    },
    filename: (req, file, cb) => {
        cb(null, `shop-${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

const query = (sql, params) => db.promise.execute(sql, params).then(([results]) => results);

// 1. Dashboard Overview Stats
router.get("/stats", requireSeller, async (req, res) => {
    try {
        const sellerId = req.seller.id;

        // Shop status and Verification
        const [seller] = await query("SELECT status, admin_remarks FROM sellers WHERE id = ?", [sellerId]);
        if (!seller) {
            console.error(`[STATS] Seller not found for ID: ${sellerId}`);
            return res.status(404).json({ message: "Seller not found" });
        }

        // Get Shop ID for this seller
        const [shop] = await query("SELECT id FROM shops WHERE seller_id = ?", [sellerId]);
        const shopId = shop ? shop.id : null;

        console.log(`[STATS] Debug Stats: sellerId=${sellerId}, shopId=${shopId}`);

        let productCount = { count: 0 };
        let activeProducts = { count: 0 };
        let orders = [];

        // If no shop, return early with zero stats to prevent crash
        if (!shopId) {
            return res.json({
                shopStatus: seller.status,
                adminRemarks: seller.admin_remarks,
                totalProducts: 0,
                activeProducts: 0,
                cancelledOrders: 0,
                customizedOrders: 0,
                avgOrderValue: 0,
                ordersSummary: { total: 0, today: 0 },
                earnings: { total: 0, withdrawn: 0, pending: 0 }
            });
        }

        if (shopId) {
            console.log(`[STATS] Fetching product counts for shopId: ${shopId}`);
            const pCountResult = await query("SELECT COUNT(*) as count FROM products WHERE shop_id = ?", [shopId]);
            productCount = pCountResult[0] || { count: 0 };

            const aCountResult = await query("SELECT COUNT(*) as count FROM products WHERE shop_id = ? AND status = 'published'", [shopId]);
            activeProducts = aCountResult[0] || { count: 0 };

            console.log(`[STATS] Fetching orders for shopId: ${shopId}`);
            // Robust query to match shop_id as int or string in JSON
            const sellerOrdersSql = `
                SELECT id, items, total_amount, status, created_at 
                FROM orders 
                WHERE items LIKE ? 
                   OR items LIKE ?
                   OR items LIKE ?
                   OR items LIKE ?
            `;
            // More robust patterns matching orders/seller route
            orders = await query(sellerOrdersSql, [
                `%"shop_id":${shopId}%`,
                `%"shop_id": ${shopId}%`,
                `%"shop_id":"${shopId}"%`,
                `%"shop_id": "${shopId}"%`
            ]);
            console.log(`[STATS] Found ${orders.length} orders for shopId ${shopId}`);
        } else {
            console.log(`[STATS] No shop found for seller ${sellerId}`);
        }

        const today = new Date().toISOString().split('T')[0];
        let ordersToday = 0;
        try {
            ordersToday = orders.filter(o => {
                if (!o.created_at) return false;
                const d = new Date(o.created_at);
                if (isNaN(d.getTime())) return false; // Handle invalid dates
                return d.toISOString().startsWith(today);
            }).length;
        } catch (e) {
            console.error("[STATS] Error calculating ordersToday:", e);
        }

        // Calculate Revenue from filtered orders (naive sum of total_amount, ideally should be sum of items.shopTotal)
        let totalRevenue = 0;
        orders.forEach(o => {
            // Parse items to sum up only this shop's items
            try {
                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                const shopItems = items.filter(i => String(i.shop_id) === String(shopId));
                const shopTotal = shopItems.reduce((acc, i) => acc + (parseFloat(i.sale_price || i.price || 0) * (parseInt(i.quantity) || 1)), 0);
                totalRevenue += shopTotal;
            } catch (e) {
                console.error("[STATS] Order parse error in stats", e);
            }
        });

        // Earnings summary from wallet (or fallback to calculated revenue if wallet not set up)
        console.log(`[STATS] Fetching wallet for seller: ${sellerId}`);
        const [wallet] = await query("SELECT * FROM seller_wallets WHERE seller_id = ?", [sellerId]);

        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
        const customizedOrders = orders.filter(o => {
            try {
                const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                return items.some(i => String(i.shop_id) === String(shopId) && (i.customization_details || i.is_customizable));
            } catch (e) { return false; }
        }).length;

        res.json({
            shopStatus: seller.status,
            adminRemarks: seller.admin_remarks,
            totalProducts: productCount.count,
            activeProducts: activeProducts.count,
            cancelledOrders,
            customizedOrders,
            avgOrderValue: orders.length > 0 ? (totalRevenue / orders.length) : 0,
            ordersSummary: {
                total: orders.length,
                today: ordersToday
            },
            earnings: {
                total: wallet ? wallet.total_earnings : totalRevenue,
                withdrawn: wallet ? wallet.withdrawn_amount : 0,
                pending: wallet ? wallet.pending_clearance : 0
            }
        });
    } catch (err) {
        console.error("[STATS] CRITICAL ERROR:", err);
        res.status(500).json({ message: "Error fetching dashboard stats", error: err.message });
    }
});

// 2. Shop Profile Management
router.get("/profile", requireSeller, async (req, res) => {
    try {
        const shops = await query("SELECT sh.*, sh.name as shop_name, s.name as owner_name, s.email, s.phone, s.status, s.admin_remarks FROM shops sh JOIN sellers s ON sh.seller_id = s.id WHERE sh.seller_id = ?", [req.seller.id]);

        if (shops.length === 0) {
            return res.status(404).json({ message: "No shop record found for this seller. Please complete onboarding." });
        }

        // Add shop_id alias for frontend compatibility (some components expect shop_id, some expect id)
        const profile = {
            ...shops[0],
            shop_id: shops[0].id
        };

        res.json(profile);
    } catch (err) {
        console.error("❌ Profile fetch error:", err);
        res.status(500).json({ message: "Error fetching shop profile" });
    }
});

router.put("/profile", requireSeller, upload.single('logo'), async (req, res) => {
    try {
        const { name, description, address_line1, city, state, pincode, latitude, longitude } = req.body;
        const logo_url = req.file ? `/uploads/sellers/${req.file.filename}` : undefined;

        let sql = "UPDATE shops SET name=?, description=?, address_line1=?, city=?, state=?, pincode=?, latitude=?, longitude=?";
        let params = [name, description, address_line1, city, state, pincode, latitude, longitude];

        if (logo_url) {
            sql += ", logo_url=?";
            params.push(logo_url);
        }

        sql += " WHERE seller_id=?";
        params.push(req.seller.id);

        await query(sql, params);
        res.json({ message: "Shop profile updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error updating shop profile" });
    }
});

// 3. Earnings & Payout history
router.get("/earnings", requireSeller, async (req, res) => {
    try {
        const sellerId = req.seller.id;
        const [wallet] = await query("SELECT * FROM seller_wallets WHERE seller_id = ?", [sellerId]);
        const payouts = await query("SELECT * FROM payout_requests WHERE seller_id = ? ORDER BY created_at DESC", [sellerId]);

        // Fetch shop ID to find relevant orders
        const [shops] = await query("SELECT id FROM shops WHERE seller_id = ?", [sellerId]);
        const shopId = shops[0]?.id;

        let transactions = [];
        if (shopId) {
            // Fetch recent orders for this shop to show fee breakdown
            const ordersSql = `
                SELECT id, items, status, created_at 
                FROM orders 
                WHERE (items LIKE ? OR items LIKE ? OR items LIKE ? OR items LIKE ?)
                ORDER BY created_at DESC LIMIT 15
            `;
            const orders = await query(ordersSql, [
                `%"shop_id":${shopId}%`,
                `%"shop_id": ${shopId}%`,
                `%"shop_id":"${shopId}"%`,
                `%"shop_id": "${shopId}"%`
            ]);

            transactions = orders.map(order => {
                let items = [];
                try {
                    let rawItems = order.items;
                    while (typeof rawItems === 'string') rawItems = JSON.parse(rawItems);
                    items = Array.isArray(rawItems) ? rawItems : [];
                } catch (e) { console.error("Parse error", e); }

                const shopItems = items.filter(i => String(i.shop_id) === String(shopId));

                let orderGross = 0;
                let orderFees = { commission: 0, closingFee: 0, shippingFee: 0, total: 0 };

                shopItems.forEach(item => {
                    const price = parseFloat(item.sale_price || item.price || 0) * (parseInt(item.quantity) || 1);
                    orderGross += price;

                    // Calculate breakdown
                    const breakdown = calculateItemFees(price);
                    orderFees.commission += breakdown.commission;
                    orderFees.closingFee += breakdown.closingFee;
                    orderFees.shippingFee += breakdown.shippingFee;
                    orderFees.total += breakdown.totalFees;
                });

                return {
                    orderId: order.id,
                    createdAt: order.created_at,
                    status: order.status,
                    grossAmount: orderGross,
                    fees: orderFees,
                    netEarnings: orderGross - orderFees.total
                };
            });
        }

        res.json({ wallet, payouts, transactions });
    } catch (err) {
        console.error("❌ Earnings Error:", err);
        res.status(500).json({ message: "Error fetching earnings" });
    }
});

// 5. Performance Reports Analytics
router.get("/reports", requireSeller, async (req, res) => {
    try {
        const sellerId = req.seller.id;
        const [shops] = await query("SELECT id FROM shops WHERE seller_id = ?", [sellerId]);
        const shopId = shops[0]?.id;

        if (!shopId) {
            return res.json({
                dailySales: [],
                categoryPerformance: [],
                topProducts: []
            });
        }

        // Fetch all matching orders to process data in JS
        const ordersSql = `
            SELECT items, created_at 
            FROM orders 
            WHERE (items LIKE ? OR items LIKE ? OR items LIKE ? OR items LIKE ?)
              AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              AND status != 'cancelled'
        `;
        const orders = await query(ordersSql, [
            `%"shop_id":${shopId}%`,
            `%"shop_id": ${shopId}%`,
            `%"shop_id":"${shopId}"%`,
            `%"shop_id": "${shopId}"%`
        ]);

        // Fetch category names for all products in these orders to have accurate breakdown
        const productIds = Array.from(new Set(orders.flatMap(order => {
            try {
                let items = order.items;
                while (typeof items === 'string') items = JSON.parse(items);
                return Array.isArray(items) ? items.filter(i => String(i.shop_id) === String(shopId)).map(i => i.id || i.product_id) : [];
            } catch (e) { return []; }
        })));

        let catMapById = {};
        if (productIds.length > 0) {
            const productCats = await query(
                "SELECT p.id, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id IN (?)",
                [productIds]
            );
            catMapById = productCats.reduce((acc, pc) => { acc[pc.id] = pc.category_name; return acc; }, {});
        }

        const salesMap = {};
        const catMap = {};
        const prodMap = {};

        orders.forEach(order => {
            let items = [];
            try {
                let rawItems = order.items;
                while (typeof rawItems === 'string') rawItems = JSON.parse(rawItems);
                items = Array.isArray(rawItems) ? rawItems : [];
            } catch (e) { return; }

            const date = new Date(order.created_at).toISOString().split('T')[0];
            const shopItems = items.filter(i => String(i.shop_id) === String(shopId));

            shopItems.forEach(item => {
                const itemTotal = parseFloat(item.sale_price || item.price || 0) * (parseInt(item.quantity) || 1);

                // Daily Sales
                salesMap[date] = (salesMap[date] || 0) + itemTotal;

                // Category Performance
                const catName = catMapById[item.id || item.product_id] || item.category_name || 'Other';
                catMap[catName] = (catMap[catName] || 0) + itemTotal;

                // Top Products
                const prodName = item.name || 'Unknown Product';
                if (!prodMap[prodName]) prodMap[prodName] = { name: prodName, total: 0, count: 0 };
                prodMap[prodName].total += itemTotal;
                prodMap[prodName].count += parseInt(item.quantity) || 1;
            });
        });

        // Format for response
        const dailySales = Object.keys(salesMap).map(date => ({ date, total: salesMap[date] }));
        const categoryPerformance = Object.keys(catMap).map(name => ({ name, total: catMap[name] }));
        const topProducts = Object.values(prodMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        res.json({ dailySales, categoryPerformance, topProducts });
    } catch (err) {
        console.error("❌ Reports Error:", err);
        res.status(500).json({ message: "Error fetching reports" });
    }
});

// 4. Request Payout
router.post("/payouts/request", requireSeller, async (req, res) => {
    const { amount } = req.body;
    try {
        const [wallet] = await query("SELECT current_balance FROM seller_wallets WHERE seller_id = ?", [req.seller.id]);

        if (!wallet || wallet.current_balance < amount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // Fetch bank info snapshot
        const [bank] = await query("SELECT * FROM seller_bank_details WHERE seller_id = ?", [req.seller.id]);

        await query("INSERT INTO payout_requests (seller_id, amount, status, bank_details_snapshot) VALUES (?, ?, 'PENDING', ?)",
            [req.seller.id, amount, JSON.stringify(bank)]);

        // Logically we should deduct balance or mark it as held?
        // Let's just create the request for now.

        res.json({ message: "Payout request submitted" });
    } catch (err) {
        res.status(500).json({ message: "Error requesting payout" });
    }
});

// 5. Notifications
router.get("/notifications", requireSeller, async (req, res) => {
    try {
        const notifications = await query("SELECT * FROM seller_notifications WHERE seller_id = ? ORDER BY created_at DESC", [req.seller.id]);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ message: "Error fetching notifications" });
    }
});

// 6. Support Tickets
router.post("/support", requireSeller, async (req, res) => {
    const { subject, description, priority } = req.body;
    try {
        await query("INSERT INTO support_tickets (user_id, subject, description, priority) VALUES (?, ?, ?, ?)",
            [req.seller.id, subject, description, priority]);
        res.json({ message: "Support ticket created successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error creating ticket" });
    }
});

module.exports = router;
