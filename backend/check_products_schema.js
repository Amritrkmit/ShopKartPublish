require('dotenv').config();
const db = require('./db');

async function checkSchema() {
    try {
        console.log('🔍 Checking products table schema...');
        const [columns] = await db.promise.execute("SHOW COLUMNS FROM products");

        const columnNames = columns.map(c => c.Field);
        console.log('✅ Found columns:', columnNames.join(', '));

        // Columns used in PUT /:id query
        const requiredColumns = [
            'name', 'slug', 'price', 'sale_price', 'description', 'category_id', 'subcategory_id',
            'stock', 'available_sizes', 'size_chart', 'sku', 'barcode', 'track_inventory',
            'stock_status', 'weight', 'dimensions', 'shipping_class', 'tags', 'attributes',
            'meta_title', 'meta_description', 'meta_keywords', 'brand', 'similar_products', 'shop_id', 'image'
        ];

        const missing = requiredColumns.filter(c => !columnNames.includes(c));

        if (missing.length > 0) {
            console.error('\n❌ MISSING COLUMNS:', missing.join(', '));
            console.error('The update query will fail because these columns do not exist in the database.');
        } else {
            console.log('\n✅ All columns required for update query are present.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking schema:', error);
        process.exit(1);
    }
}

checkSchema();
