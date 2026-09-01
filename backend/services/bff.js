/**
 * Backend-for-Frontend (BFF) Service
 * 
 * This layer sits between your database/business logic and the frontend.
 * It:
 * 1. Fetches data from the database
 * 2. Applies DTOs to clean sensitive fields
 * 3. Formats data for frontend consumption
 * 4. Handles data transformations and aggregations
 */

const db = require('../db');
const {
    UserDTO,
    ProductDTO,
    OrderDTO,
    SellerDTO,
    ShopDTO,
    ReviewDTO,
    CategoryDTO,
    CouponDTO,
    AnalyticsDTO
} = require('../dtos');

class BFFService {
    /**
     * Execute a database query and return cleaned results
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @param {Function} dtoFn - DTO cleaning function
     * @returns {Promise<Array>} Cleaned results
     */
    static async queryAndClean(query, params, dtoFn) {
        try {
            const [rows] = await db.promise.query(query, params);
            if (typeof dtoFn === 'function') {
                return Array.isArray(rows) ? rows.map(row => dtoFn(row)) : dtoFn(rows);
            }
            return rows;
        } catch (error) {
            console.error('BFF Query Error:', error);
            throw error;
        }
    }

    /**
     * Execute a database query and return a single cleaned result
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @param {Function} dtoFn - DTO cleaning function
     * @returns {Promise<Object|null>} Cleaned result
     */
    static async queryOneAndClean(query, params, dtoFn) {
        try {
            const [rows] = await db.promise.query(query, params);
            if (rows.length === 0) return null;
            return typeof dtoFn === 'function' ? dtoFn(rows[0]) : rows[0];
        } catch (error) {
            console.error('BFF Query Error:', error);
            throw error;
        }
    }

    // ==================== USER BFF METHODS ====================

    /**
     * Get user profile (cleaned)
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Cleaned user profile
     */
    static async getUserProfile(userId) {
        const query = 'SELECT * FROM users WHERE id = ?';
        return this.queryOneAndClean(query, [userId], UserDTO.toProfile);
    }

    /**
     * Get user by email (cleaned)
     * @param {string} email - User email
     * @returns {Promise<Object|null>} Cleaned user
     */
    static async getUserByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        return this.queryOneAndClean(query, [email], UserDTO.toPublic);
    }

    // ==================== PRODUCT BFF METHODS ====================

    /**
     * Get product by ID (cleaned)
     * @param {number} productId - Product ID
     * @returns {Promise<Object|null>} Cleaned product
     */
    static async getProductById(productId) {
        const query = `
      SELECT p.*, 
             c.name as category_name, 
             s.name as subcategory_name,
             b.name as brand_name,
             sh.name as shop_name,
             sh.slug as shop_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN shops sh ON p.shop_id = sh.id
      WHERE p.id = ?
    `;
        return this.queryOneAndClean(query, [productId], ProductDTO.toPublic);
    }

    /**
     * Get product by slug (cleaned)
     * @param {string} slug - Product slug
     * @returns {Promise<Object|null>} Cleaned product
     */
    static async getProductBySlug(slug) {
        const query = `
      SELECT p.*, 
             c.name as category_name, 
             s.name as subcategory_name,
             b.name as brand_name,
             sh.name as shop_name,
             sh.slug as shop_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN shops sh ON p.shop_id = sh.id
      WHERE p.slug = ?
    `;
        return this.queryOneAndClean(query, [slug], ProductDTO.toPublic);
    }

    /**
     * Get products by category (cleaned)
     * @param {number} categoryId - Category ID
     * @param {Object} options - Query options (limit, offset, sort)
     * @returns {Promise<Array>} Cleaned products
     */
    static async getProductsByCategory(categoryId, options = {}) {
        const { limit = 20, offset = 0, sort = 'created_at DESC' } = options;

        const query = `
      SELECT p.*, 
             c.name as category_name,
             b.name as brand_name,
             sh.name as shop_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN shops sh ON p.shop_id = sh.id
      WHERE p.category_id = ? AND p.status = 'published'
      ORDER BY ${sort}
      LIMIT ? OFFSET ?
    `;

        const [rows] = await db.promise.query(query, [categoryId, limit, offset]);
        return ProductDTO.toList(rows);
    }

    /**
     * Search products (cleaned)
     * @param {string} searchTerm - Search term
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Cleaned products
     */
    static async searchProducts(searchTerm, options = {}) {
        const { limit = 20, offset = 0 } = options;

        const query = `
      SELECT p.*, 
             c.name as category_name,
             b.name as brand_name,
             sh.name as shop_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN shops sh ON p.shop_id = sh.id
      WHERE (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)
        AND p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const searchPattern = `%${searchTerm}%`;
        const [rows] = await db.promise.query(query, [
            searchPattern,
            searchPattern,
            searchPattern,
            limit,
            offset
        ]);

        return ProductDTO.toList(rows);
    }

    // ==================== ORDER BFF METHODS ====================

    /**
     * Get user orders (cleaned)
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Cleaned orders
     */
    static async getUserOrders(userId, options = {}) {
        const { limit = 10, offset = 0, status = null } = options;

        let query = 'SELECT * FROM orders WHERE user_id = ?';
        const params = [userId];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [rows] = await db.promise.query(query, params);
        return OrderDTO.toList(rows);
    }

    /**
     * Get order by ID (cleaned)
     * @param {string} orderId - Order ID (can be numeric ID, ULID, or token)
     * @param {number} userId - User ID (for authorization)
     * @returns {Promise<Object|null>} Cleaned order
     */
    static async getOrderById(orderId, userId) {
        const isNumericId = /^\d+$/.test(orderId);
        let whereClause = '(order_id = ? OR url_token = ?)';
        let whereParams = [orderId, orderId];

        if (isNumericId) {
            whereClause = '(id = ? OR order_id = ? OR url_token = ?)';
            whereParams = [orderId, orderId, orderId];
        }

        const query = `SELECT * FROM orders WHERE ${whereClause} AND user_id = ?`;
        return this.queryOneAndClean(query, [...whereParams, userId], OrderDTO.toPublic);
    }

    // ==================== SELLER BFF METHODS ====================

    /**
     * Get seller profile (cleaned)
     * @param {number} sellerId - Seller ID
     * @returns {Promise<Object|null>} Cleaned seller profile
     */
    static async getSellerProfile(sellerId) {
        const query = `
      SELECT s.*, 
             sh.id as shop_id, 
             sh.name as shop_name, 
             sh.slug as shop_slug, 
             sh.is_active as shop_active, 
             sh.logo_url
      FROM sellers s
      LEFT JOIN shops sh ON s.id = sh.seller_id
      WHERE s.id = ?
    `;
        return this.queryOneAndClean(query, [sellerId], SellerDTO.toProfile);
    }

    /**
     * Get seller orders (cleaned, filtered to seller's shop)
     * @param {number} sellerId - Seller ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Cleaned orders
     */
    static async getSellerOrders(sellerId, options = {}) {
        const { limit = 50, status = null } = options;

        // Get seller's shop ID
        const [shops] = await db.promise.query(
            'SELECT id FROM shops WHERE seller_id = ?',
            [sellerId]
        );

        if (shops.length === 0) return [];

        const shopId = shops[0].id;

        // Fetch orders containing items from this shop
        let query = `
      SELECT o.*, 
             u.name as customer_name, 
             u.email as customer_email, 
             u.phone as customer_phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE (o.items LIKE ? OR o.items LIKE ? OR o.items LIKE ? OR o.items LIKE ?)
    `;

        const params = [
            `%"shop_id":${shopId}%`,
            `%"shop_id": ${shopId}%`,
            `%"shop_id":"${shopId}"%`,
            `%"shop_id": "${shopId}"%`
        ];

        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }

        query += ' ORDER BY o.created_at DESC LIMIT ?';
        params.push(limit);

        const [orders] = await db.promise.query(query, params);

        // Filter items to only show seller's products
        const sellerOrders = orders.map(order => {
            let allItems = [];
            try {
                allItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            } catch (e) {
                allItems = [];
            }

            const shopItems = allItems.filter(item => String(item.shop_id) === String(shopId));

            if (shopItems.length === 0) return null;

            const shopTotal = shopItems.reduce((sum, item) =>
                sum + (parseFloat(item.sale_price || item.price || 0) * (parseInt(item.quantity) || 1)), 0
            );

            // Clean sensitive customer data
            return {
                ...OrderDTO.toPublic(order),
                items: ProductDTO.toList(shopItems),
                shop_total: shopTotal,
                customer: {
                    name: order.customer_name,
                    // Don't expose email/phone to seller for privacy
                }
            };
        }).filter(Boolean);

        return sellerOrders;
    }

    // ==================== SHOP BFF METHODS ====================

    /**
     * Get shop by ID (cleaned)
     * @param {number} shopId - Shop ID
     * @returns {Promise<Object|null>} Cleaned shop
     */
    static async getShopById(shopId) {
        const query = 'SELECT * FROM shops WHERE id = ?';
        return this.queryOneAndClean(query, [shopId], ShopDTO.toPublic);
    }

    /**
     * Get shop by slug (cleaned)
     * @param {string} slug - Shop slug
     * @returns {Promise<Object|null>} Cleaned shop
     */
    static async getShopBySlug(slug) {
        const query = 'SELECT * FROM shops WHERE slug = ?';
        return this.queryOneAndClean(query, [slug], ShopDTO.toPublic);
    }

    /**
     * Get active shops (cleaned)
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Cleaned shops
     */
    static async getActiveShops(options = {}) {
        const { limit = 20, offset = 0 } = options;

        const query = `
      SELECT * FROM shops 
      WHERE is_active = 1 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

        const [rows] = await db.promise.query(query, [limit, offset]);
        return ShopDTO.toList(rows);
    }

    // ==================== REVIEW BFF METHODS ====================

    /**
     * Get product reviews (cleaned)
     * @param {number} productId - Product ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Cleaned reviews
     */
    static async getProductReviews(productId, options = {}) {
        const { limit = 10, offset = 0 } = options;

        const query = `
      SELECT r.*, u.name as user_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = ? AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const [rows] = await db.promise.query(query, [productId, limit, offset]);
        return ReviewDTO.toList(rows);
    }

    // ==================== CATEGORY BFF METHODS ====================

    /**
     * Get all categories (cleaned)
     * @returns {Promise<Array>} Cleaned categories
     */
    static async getAllCategories() {
        const query = 'SELECT * FROM categories WHERE status = "active" ORDER BY name ASC';
        const [rows] = await db.promise.query(query);
        return CategoryDTO.toList(rows);
    }

    /**
     * Get category by slug (cleaned)
     * @param {string} slug - Category slug
     * @returns {Promise<Object|null>} Cleaned category
     */
    static async getCategoryBySlug(slug) {
        const query = 'SELECT * FROM categories WHERE slug = ?';
        return this.queryOneAndClean(query, [slug], CategoryDTO.toPublic);
    }

    // ==================== COUPON BFF METHODS ====================

    /**
     * Get active coupons for user (cleaned)
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Cleaned coupons
     */
    static async getActiveCouponsForUser(userId) {
        const query = `
      SELECT * FROM coupons 
      WHERE is_active = 1 
        AND valid_from <= NOW() 
        AND valid_until >= NOW()
        AND (user_specific = 0 OR user_id = ?)
      ORDER BY discount_value DESC
    `;

        const [rows] = await db.promise.query(query, [userId]);
        return rows.map(coupon => CouponDTO.toUserView(coupon));
    }

    /**
     * Validate and get coupon (cleaned)
     * @param {string} code - Coupon code
     * @param {number} userId - User ID
     * @returns {Promise<Object|null>} Cleaned coupon
     */
    static async validateCoupon(code, userId) {
        const query = `
      SELECT * FROM coupons 
      WHERE code = ? 
        AND is_active = 1 
        AND valid_from <= NOW() 
        AND valid_until >= NOW()
        AND (user_specific = 0 OR user_id = ?)
      LIMIT 1
    `;

        return this.queryOneAndClean(query, [code, userId], CouponDTO.toUserView);
    }
}

module.exports = BFFService;
