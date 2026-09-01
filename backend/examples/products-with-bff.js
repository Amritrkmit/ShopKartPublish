/**
 * Example: Products Route with BFF Pattern
 * 
 * This file demonstrates how to refactor existing routes to use the BFF pattern.
 * Copy these patterns to your actual routes files.
 */

const express = require('express');
const router = express.Router();
const BFFService = require('../services/bff');
const { ProductDTO } = require('../dtos');
const db = require('../db');

// ==================== PUBLIC ROUTES (Use BFF) ====================

/**
 * GET /api/products/:id
 * Get single product by ID (cleaned)
 */
router.get('/:id', async (req, res) => {
    try {
        const product = await BFFService.getProductById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/products/slug/:slug
 * Get single product by slug (cleaned)
 */
router.get('/slug/:slug', async (req, res) => {
    try {
        const product = await BFFService.getProductBySlug(req.params.slug);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/products/category/:categoryId
 * Get products by category (cleaned)
 */
router.get('/category/:categoryId', async (req, res) => {
    try {
        const { limit = 20, offset = 0, sort = 'created_at DESC' } = req.query;

        const products = await BFFService.getProductsByCategory(
            req.params.categoryId,
            { limit: parseInt(limit), offset: parseInt(offset), sort }
        );

        res.json({ products, count: products.length });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/products/search
 * Search products (cleaned)
 */
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 20, offset = 0 } = req.query;

        if (!q) {
            return res.status(400).json({ message: 'Search query required' });
        }

        const products = await BFFService.searchProducts(q, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({ products, count: products.length });
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/products
 * Get all products with filters (cleaned)
 */
router.get('/', async (req, res) => {
    try {
        const {
            limit = 20,
            offset = 0,
            category_id,
            subcategory_id,
            brand_id,
            min_price,
            max_price,
            sort = 'created_at DESC'
        } = req.query;

        // Build dynamic query
        let query = `
      SELECT p.*, 
             c.name as category_name,
             s.name as subcategory_name,
             b.name as brand_name,
             sh.name as shop_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN shops sh ON p.shop_id = sh.id
      WHERE p.status = 'published'
    `;

        const params = [];

        if (category_id) {
            query += ' AND p.category_id = ?';
            params.push(category_id);
        }

        if (subcategory_id) {
            query += ' AND p.subcategory_id = ?';
            params.push(subcategory_id);
        }

        if (brand_id) {
            query += ' AND p.brand_id = ?';
            params.push(brand_id);
        }

        if (min_price) {
            query += ' AND (p.sale_price >= ? OR p.price >= ?)';
            params.push(min_price, min_price);
        }

        if (max_price) {
            query += ' AND (p.sale_price <= ? OR p.price <= ?)';
            params.push(max_price, max_price);
        }

        query += ` ORDER BY ${sort} LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        // Use BFF helper to query and clean
        const products = await BFFService.queryAndClean(query, params, ProductDTO.toPublic);

        res.json({ products, count: products.length });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/products/featured
 * Get featured products (cleaned)
 */
router.get('/featured', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const query = `
      SELECT p.*, 
             c.name as category_name,
             b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.featured = 1 AND p.status = 'published'
      ORDER BY p.created_at DESC
      LIMIT ?
    `;

        const products = await BFFService.queryAndClean(query, [parseInt(limit)], ProductDTO.toPublic);

        res.json({ products });
    } catch (error) {
        console.error('Error fetching featured products:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * GET /api/products/:id/related
 * Get related products (cleaned)
 */
router.get('/:id/related', async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        // First get the product to find related items
        const product = await BFFService.getProductById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Find related products by category
        const query = `
      SELECT p.*, 
             c.name as category_name,
             b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.category_id = ? 
        AND p.id != ? 
        AND p.status = 'published'
      ORDER BY RAND()
      LIMIT ?
    `;

        const relatedProducts = await BFFService.queryAndClean(
            query,
            [product.category_id, product.id, parseInt(limit)],
            ProductDTO.toCard // Use card view for related products
        );

        res.json({ products: relatedProducts });
    } catch (error) {
        console.error('Error fetching related products:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== ADMIN ROUTES (Less strict filtering) ====================

/**
 * GET /api/products/admin/all
 * Get all products for admin (includes more fields but still filters sensitive data)
 * Note: This route should be protected with requireAdminJWT middleware
 */
router.get('/admin/all', /* requireAdminJWT, */ async (req, res) => {
    try {
        const { limit = 50, offset = 0, status } = req.query;

        let query = `
      SELECT p.*, 
             c.name as category_name,
             s.name as subcategory_name,
             b.name as brand_name,
             sh.name as shop_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN shops sh ON p.shop_id = sh.id
    `;

        const params = [];

        if (status) {
            query += ' WHERE p.status = ?';
            params.push(status);
        }

        query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await db.promise.query(query, params);

        // For admin, we can show more fields but still filter highly sensitive ones
        const products = rows.map(product => {
            const cleaned = ProductDTO.toPublic(product);
            // Admin can see these additional fields
            return {
                ...cleaned,
                stock: product.stock,
                sku: product.sku,
                status: product.status
            };
        });

        res.json({ products, count: products.length });
    } catch (error) {
        console.error('Error fetching admin products:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
