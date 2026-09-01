const express = require('express');
const router = express.Router();
const db = require('../db');
const { ulid } = require('ulid');
const crypto = require('crypto');
const requireAdminJWT = require('../middlewares/requireAdminJWT');
const { BrandDTO } = require('../dtos'); // Import DTO for data cleaning

// Get brands (filtered by category or subcategory) - cleaned
router.get('/', async (req, res) => {
    const { category_id, subcategory_id } = req.query;
    try {
        let sql = 'SELECT * FROM brands WHERE status = "active"';
        let params = [];

        if (subcategory_id || category_id) {
            sql = `
                SELECT DISTINCT b.* 
                FROM brands b
                JOIN brand_mappings bm ON b.id = bm.brand_id
                WHERE b.status = 'active'
            `;
            if (subcategory_id) {
                sql += ' AND bm.subcategory_id = ?';
                params.push(subcategory_id);
            } else if (category_id) {
                sql += ' AND bm.category_id = ?';
                params.push(category_id);
            }
            sql += ' ORDER BY b.name ASC';
        } else {
            sql += ' ORDER BY name ASC';
        }

        const [rows] = await db.promise.query(sql, params);

        // Clean the data before sending to frontend
        const cleanedBrands = BrandDTO.toList(rows);
        res.json(cleanedBrands);
    } catch (err) {
        console.error('Error fetching brands:', err);
        res.status(500).json({ message: 'Error fetching brands' });
    }
});

const authMiddleware = require('../middlewares/userJWT');

// Middleware to allow Admin OR Seller
const requireAdminOrSeller = async (req, res, next) => {
    authMiddleware(req, res, async () => {
        // With role isolation, we trust the token's role claim if it's been verified by authMiddleware
        const role = req.user.role;

        if (role === 'admin' || role === 'seller') {
            next();
        } else {
            // If the role is not 'admin' or 'seller' (or not present), deny access.
            // The instruction specifically asks to trust the role claim and remove legacy table checks.
            return res.status(403).json({ message: "Access denied. Admins or Sellers only." });
        }
    });
};

// Admin/Seller: Get mapped brand IDs for a category/subcategory
router.get('/mappings', requireAdminOrSeller, async (req, res) => {
    const { category_id, subcategory_id } = req.query;
    try {
        let sql = 'SELECT brand_id FROM brand_mappings WHERE 1=1';
        let params = [];
        if (subcategory_id) {
            sql += ' AND subcategory_id = ?';
            params.push(subcategory_id);
        } else if (category_id) {
            sql += ' AND category_id = ? AND subcategory_id IS NULL';
            params.push(category_id);
        }
        const [rows] = await db.promise.query(sql, params);
        res.json(rows.map(r => r.brand_id));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching mappings' });
    }
});

// Admin/Seller: Get all brands for mapping dropdowns
router.get('/all', requireAdminOrSeller, async (req, res) => {
    try {
        const [rows] = await db.promise.query('SELECT id, name FROM brands ORDER BY name ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching brands' });
    }
});

// Admin/Seller: Add a brand
router.post('/', requireAdminOrSeller, async (req, res) => {
    const { name, logo, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Brand name is required' });

    try {
        const uid = `BRD-${ulid()}`;
        const url_token = crypto.randomBytes(64).toString('hex');
        await db.promise.query(
            'INSERT INTO brands (uid, url_token, name, logo, description) VALUES (?, ?, ?, ?, ?)',
            [uid, url_token, name, logo || null, description || null]
        );
        res.status(201).json({ message: 'Brand added successfully' });
    } catch (err) {
        console.error('Error adding brand:', err);
        res.status(500).json({ message: 'Error adding brand' });
    }
});

// Update a brand (Admin Only)
router.put('/:id', requireAdminJWT, async (req, res) => {
    const { name, logo, description, status } = req.body;
    const { id } = req.params;

    try {
        await db.promise.query(
            'UPDATE brands SET name = ?, logo = ?, description = ?, status = ? WHERE id = ?',
            [name, logo, description, status, id]
        );
        res.json({ message: 'Brand updated successfully' });
    } catch (err) {
        console.error('Error updating brand:', err);
        res.status(500).json({ message: 'Error updating brand' });
    }
});

// Delete a brand (Admin Only)
router.delete('/:id', requireAdminJWT, async (req, res) => {
    const { id } = req.params;
    try {
        await db.promise.query('DELETE FROM brands WHERE id = ?', [id]);
        res.json({ message: 'Brand deleted successfully' });
    } catch (err) {
        console.error('Error deleting brand:', err);
        res.status(500).json({ message: 'Error deleting brand' });
    }
});

module.exports = router;
