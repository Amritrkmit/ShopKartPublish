const db = require('../db');
const builder = require('xmlbuilder');
const fs = require('fs');
const path = require('path');

const SITE_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const sitemapService = {
    // 1. Fetch all data
    getSitemapData: async () => {
        try {
            // Helper for Promisified Queries
            const query = (sql, params = []) => {
                return new Promise((resolve, reject) => {
                    db.query(sql, params, (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                });
            };

            // Fetch Data in Parallel
            const [categories, subcategories, products, shops, brands] = await Promise.all([
                query('SELECT id, name, slug FROM categories'),
                query('SELECT id, parent_id, category_id, name, slug FROM subcategories'),
                query('SELECT id, name, slug FROM products WHERE status = \'published\''),
                query('SELECT id, name, slug FROM shops WHERE is_active = 1'),
                query('SELECT id, name FROM brands')
            ]);

            return { categories, subcategories, products, shops, brands };
        } catch (error) {
            console.error('Error fetching sitemap data:', error);
            throw error;
        }
    },

    // 2. Generate XML
    generateXML: async () => {
        try {
            console.log('🔄 Generating Sitemap...');
            const { categories, subcategories, products, shops, brands } = await sitemapService.getSitemapData();

            const root = builder.create('urlset', { encoding: 'UTF-8' })
                .att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

            // Helper to add URL
            const addUrl = (loc, changefreq = 'daily', priority = 0.8) => {
                const item = root.ele('url');
                item.ele('loc', `${SITE_URL}${loc}`);
                item.ele('changefreq', changefreq);
                item.ele('priority', priority);
            };

            const slugify = (text) => {
                return text.toString().toLowerCase()
                    .replace(/\s+/g, '-')           // Replace spaces with -
                    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
                    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
                    .replace(/^-+/, '')             // Trim - from start of text
                    .replace(/-+$/, '');            // Trim - from end of text
            };

            // Static Pages
            addUrl('/', 'daily', 1.0);
            addUrl('/login', 'monthly', 0.5);
            addUrl('/register', 'monthly', 0.5);
            addUrl('/about', 'monthly', 0.6);
            addUrl('/contact', 'monthly', 0.6);
            // Sitemap itself shouldn't necessarily be IN the sitemap, but ok if requested
            // addUrl('/sitemap', 'weekly', 0.6); 

            // Categories
            categories.forEach(cat => {
                addUrl(`/category/${cat.slug}`, 'weekly', 0.8);
            });

            // Subcategories
            // URL structure: /subcategory/:slug (as per common routes)
            subcategories.forEach(sub => {
                addUrl(`/subcategory/${sub.slug}`, 'weekly', 0.8);
            });

            // Products
            products.forEach(prod => {
                addUrl(`/product/${prod.slug}`, 'daily', 0.9);
            });

            // Shops
            shops.forEach(shop => {
                addUrl(`/shop/${shop.slug}`, 'weekly', 0.7);
            });

            const xml = root.end({ pretty: true });

            // Define output path (backend/public/sitemap.xml)
            const publicDir = path.join(__dirname, '../public');
            const outputPath = path.join(publicDir, 'sitemap.xml');

            // Ensure public dir exists
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true });
            }

            fs.writeFileSync(outputPath, xml);
            console.log('✅ Sitemap XML Generated at ' + outputPath);

            return { success: true, timestamp: new Date() };

        } catch (error) {
            console.error('XML Gen Error detail:', error);
            return { success: false, error: error.message || error };
        }
    },

    // 3. Get JSON Tree for Frontend Page (Optional HTML Sitemap)
    getSitemapJSON: async () => {
        const { categories, subcategories, shops } = await sitemapService.getSitemapData();
        return {
            categories,
            subcategories,
            shops,
            generated_at: new Date()
        };
    }
};

module.exports = sitemapService;
