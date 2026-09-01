/**
 * Example: Users Route with BFF Pattern
 * 
 * This file demonstrates how to refactor user routes to use the BFF pattern.
 */

const express = require('express');
const router = express.Router();
const BFFService = require('../services/bff');
const { UserDTO } = require('../dtos');
const authMiddleware = require('../middlewares/userJWT');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ==================== AUTHENTICATION ROUTES ====================

/**
 * POST /users/login
 * User login (returns cleaned user data)
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please fill all fields' });
        }

        // Fetch user from database
        const [users] = await db.promise.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || 'user' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Return cleaned user data (no password, no sensitive fields)
        const cleanUser = UserDTO.toProfile(user);

        res.json({
            message: 'Login successful',
            token,
            user: cleanUser
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /users/register
 * User registration (returns cleaned user data)
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Please fill all fields' });
        }

        // Check if user exists
        const [existing] = await db.promise.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const [result] = await db.promise.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'user']
        );

        // Generate JWT
        const token = jwt.sign(
            { id: result.insertId, email, role: 'user' },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Return cleaned user data
        const cleanUser = {
            id: result.insertId,
            name,
            email,
            role: 'user'
        };

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: cleanUser
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== PROFILE ROUTES ====================

/**
 * GET /users/me
 * Get current user profile (cleaned)
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await BFFService.getUserProfile(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * PUT /users/me
 * Update user profile (returns cleaned data)
 */
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // Check if email is taken by another user
        const [existing] = await db.promise.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, req.user.id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Update user
        await db.promise.query(
            'UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?',
            [name, email, phone || null, req.user.id]
        );

        // Return updated user data (cleaned)
        const updatedUser = await BFFService.getUserProfile(req.user.id);

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== WISHLIST ROUTES ====================

/**
 * GET /users/wishlist
 * Get user's wishlist (cleaned product data)
 */
router.get('/wishlist', authMiddleware, async (req, res) => {
    try {
        const query = `
      SELECT p.*, 
             c.name as category_name,
             b.name as brand_name
      FROM wishlist w
      JOIN products p ON w.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `;

        const { ProductDTO } = require('../dtos');
        const products = await BFFService.queryAndClean(
            query,
            [req.user.id],
            ProductDTO.toCard // Use card view for wishlist
        );

        res.json({ wishlist: products });
    } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /users/wishlist/:productId
 * Add product to wishlist
 */
router.post('/wishlist/:productId', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.params;

        // Check if already in wishlist
        const [existing] = await db.promise.query(
            'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
            [req.user.id, productId]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        // Add to wishlist
        await db.promise.query(
            'INSERT INTO wishlist (user_id, product_id) VALUES (?, ?)',
            [req.user.id, productId]
        );

        res.json({ message: 'Product added to wishlist' });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * DELETE /users/wishlist/:productId
 * Remove product from wishlist
 */
router.delete('/wishlist/:productId', authMiddleware, async (req, res) => {
    try {
        const { productId } = req.params;

        const [result] = await db.promise.query(
            'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
            [req.user.id, productId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Product not in wishlist' });
        }

        res.json({ message: 'Product removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ==================== ADDRESS ROUTES ====================

/**
 * GET /users/addresses
 * Get user's addresses (cleaned)
 */
router.get('/addresses', authMiddleware, async (req, res) => {
    try {
        const [addresses] = await db.promise.query(
            'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [req.user.id]
        );

        // Addresses don't contain highly sensitive data, but we can still clean them
        const cleanedAddresses = addresses.map(addr => {
            // Remove any internal fields if they exist
            const { internal_notes, ...cleanAddr } = addr;
            return cleanAddr;
        });

        res.json(cleanedAddresses);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /users/addresses
 * Add new address
 */
router.post('/addresses', authMiddleware, async (req, res) => {
    try {
        const {
            address_line1,
            city,
            state,
            zip_code,
            country,
            type,
            is_default,
            full_name,
            mobile,
            alternate_mobile,
            flat_house
        } = req.body;

        if (!address_line1 || !city || !state || !zip_code) {
            return res.status(400).json({ message: 'Missing required address fields' });
        }

        const connection = await db.promise.getConnection();

        try {
            await connection.beginTransaction();

            // If this is default, unset other defaults
            if (is_default) {
                await connection.query(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
                    [req.user.id]
                );
            }

            // Insert new address
            const [result] = await connection.query(
                `INSERT INTO user_addresses 
         (user_id, address_line1, city, state, zip_code, country, type, is_default, full_name, mobile, alternate_mobile, flat_house) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    req.user.id,
                    address_line1,
                    city,
                    state,
                    zip_code,
                    country || 'India',
                    type || 'home',
                    is_default ? 1 : 0,
                    full_name,
                    mobile,
                    alternate_mobile,
                    flat_house
                ]
            );

            await connection.commit();

            res.json({
                message: 'Address added successfully',
                id: result.insertId
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * PUT /users/addresses/:id
 * Update address
 */
router.put('/addresses/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Verify address belongs to user
        const [existing] = await db.promise.query(
            'SELECT id FROM user_addresses WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Address not found' });
        }

        // Build update query dynamically
        const allowedFields = [
            'address_line1', 'city', 'state', 'zip_code', 'country',
            'type', 'is_default', 'full_name', 'mobile', 'alternate_mobile', 'flat_house'
        ];

        const updateFields = [];
        const updateValues = [];

        for (const field of allowedFields) {
            if (updates.hasOwnProperty(field)) {
                updateFields.push(`${field} = ?`);
                updateValues.push(updates[field]);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        updateValues.push(id, req.user.id);

        await db.promise.query(
            `UPDATE user_addresses SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
            updateValues
        );

        res.json({ message: 'Address updated successfully' });
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * DELETE /users/addresses/:id
 * Delete address
 */
router.delete('/addresses/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.promise.query(
            'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Address not found' });
        }

        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Error deleting address:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
