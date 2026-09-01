const { esClient } = require('../utils/elasticsearch');
const mysql = require('mysql2/promise');
require('dotenv').config();

const INDEX_NAME = 'products';

const sync = async () => {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // 1. Delete existing index if it exists
        const exists = await esClient.indices.exists({ index: INDEX_NAME });
        if (exists) {
            console.log('🗑️ Deleting existing index:', INDEX_NAME);
            await esClient.indices.delete({ index: INDEX_NAME });
        }

        // 2. Create index with mappings
        console.log('🏗️ Creating index:', INDEX_NAME);
        await esClient.indices.create({
            index: INDEX_NAME,
            body: {
                settings: {
                    analysis: {
                        analyzer: {
                            custom_analyzer: {
                                type: 'custom',
                                tokenizer: 'standard',
                                filter: ['lowercase', 'asciifolding']
                            }
                        }
                    }
                },
                mappings: {
                    properties: {
                        id: { type: 'integer' },
                        name: {
                            type: 'text',
                            analyzer: 'custom_analyzer',
                            fields: {
                                keyword: { type: 'keyword' }
                            }
                        },
                        slug: { type: 'keyword' },
                        sku: { type: 'keyword' },
                        description: { type: 'text', analyzer: 'custom_analyzer' },
                        price: { type: 'float' },
                        sale_price: { type: 'float' },
                        brand: { type: 'keyword' },
                        category_name: { type: 'keyword' },
                        subcategory_name: { type: 'keyword' },
                        tags: { type: 'text', analyzer: 'custom_analyzer' },
                        status: { type: 'keyword' },
                        image: { type: 'keyword' },
                        is_active: { type: 'boolean' },
                        is_assured: { type: 'boolean' }
                    }
                }
            }
        });

        // 3. Fetch products from MySQL
        console.log('📥 Fetching products from MySQL...');
        const [rows] = await connection.execute(`
      SELECT p.*, c.name as category_name, s.name as subcategory_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      WHERE p.status = 'published'
    `);

        if (rows.length === 0) {
            console.log('⚠️ No products found to index.');
            return;
        }

        // 4. Bulk Index
        console.log(`🚀 Indexing ${rows.length} products...`);
        const operations = rows.flatMap(doc => [
            { index: { _index: INDEX_NAME, _id: doc.id } },
            {
                id: doc.id,
                name: doc.name,
                slug: doc.slug,
                sku: doc.sku,
                description: doc.description,
                price: parseFloat(doc.price),
                sale_price: doc.sale_price ? parseFloat(doc.sale_price) : null,
                brand: doc.brand,
                category_name: doc.category_name,
                subcategory_name: doc.subcategory_name,
                tags: doc.tags,
                status: doc.status,
                image: doc.image,
                is_assured: Boolean(doc.is_assured),
                created_at: doc.created_at
            }
        ]);

        const bulkResponse = await esClient.bulk({ refresh: true, operations });

        if (bulkResponse.errors) {
            console.error('❌ Bulk index errors occurred');
            bulkResponse.items.forEach((action, i) => {
                const operation = Object.keys(action)[0];
                if (action[operation].error) {
                    console.error(`Error indexing doc ${rows[i].id}:`, action[operation].error);
                }
            });
        } else {
            console.log('✅ Successfully indexed all products into Elasticsearch!');
        }

    } catch (err) {
        console.error('❌ Sync Failed:', err);
    } finally {
        await connection.end();
    }
};

sync();
