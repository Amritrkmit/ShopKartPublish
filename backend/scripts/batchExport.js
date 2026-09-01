/**
 * Batch Export Script: MySQL → HDFS
 * Exports orders data from MySQL to Hadoop HDFS for analytics
 */

const db = require('../db');
const HadoopClient = require('../services/hadoopClient');

const hadoopClient = new HadoopClient();

/**
 * Export orders to HDFS
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
async function exportOrders(startDate, endDate) {
    console.log(`\n📊 Starting batch export: Orders from ${startDate} to ${endDate}`);

    try {
        // 1. Query MySQL
        const query = `
            SELECT 
                o.id,
                o.user_id,
                o.total,
                o.status,
                o.created_at,
                o.payment_method,
                o.shipping_address,
                oi.product_id,
                oi.quantity,
                oi.price as item_price,
                p.name as product_name,
                p.category_id,
                p.shop_id
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE DATE(o.created_at) BETWEEN ? AND ?
            ORDER BY o.created_at
        `;

        const [rows] = await db.promise.query(query, [startDate, endDate]);
        console.log(`✅ Fetched ${rows.length} order items from MySQL`);

        if (rows.length === 0) {
            console.log('⚠️  No data to export');
            return { success: true, count: 0 };
        }

        // 2. Transform data (group by order)
        const ordersMap = {};
        rows.forEach(row => {
            if (!ordersMap[row.id]) {
                ordersMap[row.id] = {
                    order_id: row.id,
                    user_id: row.user_id,
                    total: row.total,
                    status: row.status,
                    created_at: row.created_at,
                    payment_method: row.payment_method,
                    shipping_address: row.shipping_address,
                    items: []
                };
            }

            ordersMap[row.id].items.push({
                product_id: row.product_id,
                product_name: row.product_name,
                quantity: row.quantity,
                price: row.item_price,
                category_id: row.category_id,
                shop_id: row.shop_id
            });
        });

        const orders = Object.values(ordersMap);
        console.log(`✅ Transformed into ${orders.length} orders`);

        // 3. Create HDFS directory
        const hdfsDir = `/data/orders/${startDate}`;
        const exists = await hadoopClient.exists(hdfsDir);
        if (!exists) {
            await hadoopClient.createDirectory(hdfsDir);
        }

        // 4. Write to HDFS (JSON Lines format for Spark)
        const hdfsPath = `${hdfsDir}/orders.jsonl`;
        const jsonLines = orders.map(order => JSON.stringify(order)).join('\n');

        await hadoopClient.writeToHDFS(hdfsPath, jsonLines);
        console.log(`✅ Exported to HDFS: ${hdfsPath}`);

        return {
            success: true,
            count: orders.length,
            path: hdfsPath,
            startDate,
            endDate
        };

    } catch (error) {
        console.error('❌ Batch export failed:', error.message);
        throw error;
    }
}

/**
 * Export yesterday's orders (for daily cron job)
 */
async function exportYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    return await exportOrders(dateStr, dateStr);
}

/**
 * Export last 30 days (for backfill)
 */
async function exportLast30Days() {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];

    return await exportOrders(startDateStr, endDate);
}

// CLI support
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    const type = args[1];

    if (command === 'yesterday') {
        exportYesterday()
            .then(result => {
                console.log('\n✅ Export completed:', result);
                process.exit(0);
            })
            .catch(error => {
                console.error('\n❌ Export failed:', error);
                process.exit(1);
            });
    } else if (command === 'last30days') {
        exportLast30Days()
            .then(result => {
                console.log('\n✅ Export completed:', result);
                process.exit(0);
            })
            .catch(error => {
                console.error('\n❌ Export failed:', error);
                process.exit(1);
            });
    } else if (command === 'range' && args[1] && args[2]) {
        exportOrders(args[1], args[2])
            .then(result => {
                console.log('\n✅ Export completed:', result);
                process.exit(0);
            })
            .catch(error => {
                console.error('\n❌ Export failed:', error);
                process.exit(1);
            });
    } else if (command === 'export' && type && args[2] && args[3]) {
        // New: Export specific data type with date range
        const startDate = args[2];
        const endDate = args[3];

        let exportFunc;
        switch (type) {
            case 'orders':
                exportFunc = exportOrders;
                break;
            case 'clickstream':
                exportFunc = exportClickstream;
                break;
            case 'reviews':
                exportFunc = exportReviews;
                break;
            case 'sales':
                exportFunc = exportSalesAggregates;
                break;
            case 'all':
                exportFunc = exportAll;
                break;
            default:
                console.error(`❌ Unknown export type: ${type}`);
                console.log('Valid types: orders, clickstream, reviews, sales, all');
                process.exit(1);
        }

        exportFunc(startDate, endDate)
            .then(result => {
                console.log('\n✅ Export completed:', result);
                process.exit(0);
            })
            .catch(error => {
                console.error('\n❌ Export failed:', error);
                process.exit(1);
            });
    } else {
        console.log(`
Usage:
  node batchExport.js yesterday                    # Export yesterday's orders
  node batchExport.js last30days                   # Export last 30 days orders
  node batchExport.js range 2026-01-01 2026-01-31  # Export orders for date range
  
  node batchExport.js export orders 2026-01-01 2026-01-31       # Export orders
  node batchExport.js export clickstream 2026-01-01 2026-01-31  # Export clickstream
  node batchExport.js export reviews 2026-01-01 2026-01-31      # Export reviews
  node batchExport.js export sales 2026-01-01 2026-01-31        # Export sales aggregates
  node batchExport.js export all 2026-01-01 2026-01-31          # Export all data types
        `);
        process.exit(1);
    }
}

/**
 * Export clickstream/analytics events to HDFS
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
async function exportClickstream(startDate, endDate) {
    console.log(`\n📊 Starting batch export: Clickstream from ${startDate} to ${endDate}`);

    try {
        // 1. Query MySQL analytics table
        const query = `
            SELECT 
                id,
                visitor_id,
                page_url,
                event_type,
                event_data,
                user_id,
                ip_address,
                user_agent,
                created_at
            FROM analytics
            WHERE DATE(created_at) BETWEEN ? AND ?
            ORDER BY created_at
        `;

        const [rows] = await db.promise.query(query, [startDate, endDate]);
        console.log(`✅ Fetched ${rows.length} analytics events from MySQL`);

        if (rows.length === 0) {
            console.log('⚠️  No clickstream data to export');
            return { success: true, count: 0 };
        }

        // 2. Transform data to JSON Lines format
        const events = rows.map(row => ({
            event_id: row.id,
            visitor_id: row.visitor_id,
            page_url: row.page_url,
            event_type: row.event_type,
            event_data: typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data,
            user_id: row.user_id,
            ip_address: row.ip_address,
            user_agent: row.user_agent,
            timestamp: row.created_at
        }));

        // 3. Create HDFS directory
        const hdfsDir = `/data/clickstream/${startDate}`;
        const exists = await hadoopClient.exists(hdfsDir);
        if (!exists) {
            await hadoopClient.createDirectory(hdfsDir);
        }

        // 4. Write to HDFS
        const hdfsPath = `${hdfsDir}/events.jsonl`;
        const jsonLines = events.map(event => JSON.stringify(event)).join('\n');

        await hadoopClient.writeToHDFS(hdfsPath, jsonLines);
        console.log(`✅ Exported to HDFS: ${hdfsPath}`);

        return {
            success: true,
            count: events.length,
            path: hdfsPath,
            startDate,
            endDate
        };

    } catch (error) {
        console.error('❌ Clickstream export failed:', error.message);
        throw error;
    }
}

/**
 * Export product reviews to HDFS
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
async function exportReviews(startDate, endDate) {
    console.log(`\n📊 Starting batch export: Reviews from ${startDate} to ${endDate}`);

    try {
        // 1. Query MySQL reviews table
        const query = `
            SELECT 
                r.id,
                r.user_id,
                r.product_id,
                r.rating,
                r.comment,
                r.created_at,
                p.name as product_name,
                p.category_id,
                p.shop_id,
                u.name as user_name
            FROM reviews r
            LEFT JOIN products p ON r.product_id = p.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE DATE(r.created_at) BETWEEN ? AND ?
            ORDER BY r.created_at
        `;

        const [rows] = await db.promise.query(query, [startDate, endDate]);
        console.log(`✅ Fetched ${rows.length} reviews from MySQL`);

        if (rows.length === 0) {
            console.log('⚠️  No reviews to export');
            return { success: true, count: 0 };
        }

        // 2. Transform data
        const reviews = rows.map(row => ({
            review_id: row.id,
            user_id: row.user_id,
            user_name: row.user_name,
            product_id: row.product_id,
            product_name: row.product_name,
            category_id: row.category_id,
            shop_id: row.shop_id,
            rating: row.rating,
            comment: row.comment,
            created_at: row.created_at
        }));

        // 3. Create HDFS directory
        const hdfsDir = `/data/reviews/${startDate}`;
        const exists = await hadoopClient.exists(hdfsDir);
        if (!exists) {
            await hadoopClient.createDirectory(hdfsDir);
        }

        // 4. Write to HDFS
        const hdfsPath = `${hdfsDir}/reviews.jsonl`;
        const jsonLines = reviews.map(review => JSON.stringify(review)).join('\n');

        await hadoopClient.writeToHDFS(hdfsPath, jsonLines);
        console.log(`✅ Exported to HDFS: ${hdfsPath}`);

        return {
            success: true,
            count: reviews.length,
            path: hdfsPath,
            startDate,
            endDate
        };

    } catch (error) {
        console.error('❌ Reviews export failed:', error.message);
        throw error;
    }
}

/**
 * Export pre-aggregated sales data to HDFS
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
async function exportSalesAggregates(startDate, endDate) {
    console.log(`\n📊 Starting batch export: Sales Aggregates from ${startDate} to ${endDate}`);

    try {
        // 1. Query and aggregate sales data
        const query = `
            SELECT 
                DATE(o.created_at) as sale_date,
                o.status,
                o.payment_method,
                p.category_id,
                p.shop_id,
                COUNT(DISTINCT o.id) as order_count,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.quantity * oi.price) as total_revenue,
                AVG(oi.price) as avg_price
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE DATE(o.created_at) BETWEEN ? AND ?
            GROUP BY DATE(o.created_at), o.status, o.payment_method, p.category_id, p.shop_id
            ORDER BY sale_date, total_revenue DESC
        `;

        const [rows] = await db.promise.query(query, [startDate, endDate]);
        console.log(`✅ Fetched ${rows.length} sales aggregates from MySQL`);

        if (rows.length === 0) {
            console.log('⚠️  No sales data to export');
            return { success: true, count: 0 };
        }

        // 2. Transform data
        const aggregates = rows.map(row => ({
            sale_date: row.sale_date,
            status: row.status,
            payment_method: row.payment_method,
            category_id: row.category_id,
            shop_id: row.shop_id,
            order_count: row.order_count,
            total_quantity: row.total_quantity,
            total_revenue: parseFloat(row.total_revenue || 0),
            avg_price: parseFloat(row.avg_price || 0)
        }));

        // 3. Create HDFS directory
        const hdfsDir = `/data/sales/${startDate}`;
        const exists = await hadoopClient.exists(hdfsDir);
        if (!exists) {
            await hadoopClient.createDirectory(hdfsDir);
        }

        // 4. Write to HDFS
        const hdfsPath = `${hdfsDir}/aggregated.jsonl`;
        const jsonLines = aggregates.map(agg => JSON.stringify(agg)).join('\n');

        await hadoopClient.writeToHDFS(hdfsPath, jsonLines);
        console.log(`✅ Exported to HDFS: ${hdfsPath}`);

        return {
            success: true,
            count: aggregates.length,
            path: hdfsPath,
            startDate,
            endDate
        };

    } catch (error) {
        console.error('❌ Sales aggregates export failed:', error.message);
        throw error;
    }
}

/**
 * Export all data types to HDFS
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 */
async function exportAll(startDate, endDate) {
    console.log(`\n📊 Starting full batch export: All data from ${startDate} to ${endDate}`);

    const results = {
        startDate,
        endDate,
        exports: {}
    };

    try {
        // Export orders
        console.log('\n--- Exporting Orders ---');
        results.exports.orders = await exportOrders(startDate, endDate);

        // Export clickstream
        console.log('\n--- Exporting Clickstream ---');
        results.exports.clickstream = await exportClickstream(startDate, endDate);

        // Export reviews
        console.log('\n--- Exporting Reviews ---');
        results.exports.reviews = await exportReviews(startDate, endDate);

        // Export sales aggregates
        console.log('\n--- Exporting Sales Aggregates ---');
        results.exports.sales = await exportSalesAggregates(startDate, endDate);

        console.log('\n✅ All exports completed successfully!');
        console.log(`   Orders: ${results.exports.orders.count}`);
        console.log(`   Clickstream: ${results.exports.clickstream.count}`);
        console.log(`   Reviews: ${results.exports.reviews.count}`);
        console.log(`   Sales Aggregates: ${results.exports.sales.count}`);

        return results;

    } catch (error) {
        console.error('❌ Full export failed:', error.message);
        throw error;
    }
}

module.exports = {
    exportOrders,
    exportClickstream,
    exportReviews,
    exportSalesAggregates,
    exportAll,
    exportYesterday,
    exportLast30Days
};
