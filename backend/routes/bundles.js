const express = require('express');
const router = express.Router();
const db = require('../db');
const { resolveProductId } = require('../utils/productHelpers');
const authMiddleware = require('../middlewares/userJWT'); // Existing middleware

// Middleware to check if user is admin or seller
const isAdminOrSeller = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'seller')) {
        next();
    } else {
        res.status(403).json({ message: "Access denied. Admin or Seller only." });
    }
};

// 1. GET bundled products for a given product
router.get('/:id', async (req, res) => {
    const identifier = req.params.id;
    const productId = await resolveProductId(identifier);

    if (!productId) {
        return res.status(404).json({ message: "Product not found" });
    }

    try {
        const sql = `
            SELECT p.* 
            FROM products p
            INNER JOIN frequently_bought_together fbt ON p.id = fbt.bundle_product_id
            WHERE fbt.product_id = ?
        `;
        const [results] = await db.promise.query(sql, [productId]);
        res.json(results);
    } catch (err) {
        console.error('❌ Error fetching bundles:', err);
        res.status(500).json({ message: "Error fetching bundles" });
    }
});

// 2. POST create bundle relationship (Admin/Seller only)
router.post('/:id', authMiddleware, isAdminOrSeller, async (req, res) => {
    const identifier = req.params.id;
    const { bundle_product_id } = req.body;

    if (!bundle_product_id) {
        return res.status(400).json({ message: "bundle_product_id is required" });
    }

    const productId = await resolveProductId(identifier);
    const bundleId = await resolveProductId(bundle_product_id);

    if (!productId) {
        return res.status(404).json({ message: "Main product not found" });
    }
    if (!bundleId) {
        return res.status(404).json({ message: "Bundle product not found" });
    }

    try {
        const sql = "INSERT INTO frequently_bought_together (product_id, bundle_product_id) VALUES (?, ?)";
        await db.promise.query(sql, [productId, bundleId]);
        res.json({ message: "Bundle added successfully" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: "Bundle already exists" });
        }
        console.error('❌ Error adding bundle:', err);
        res.status(500).json({ message: "Error adding bundle" });
    }
});

// 3. DELETE bundle relationship (Admin/Seller only)
router.delete('/:id/:bundleId', authMiddleware, isAdminOrSeller, async (req, res) => {
    const { id, bundleId: bundleIdentifier } = req.params;

    const productId = await resolveProductId(id);
    const bundleId = await resolveProductId(bundleIdentifier);

    if (!productId) {
        return res.status(404).json({ message: "Main product not found" });
    }
    if (!bundleId) {
        return res.status(404).json({ message: "Bundle product not found" });
    }

    try {
        const sql = "DELETE FROM frequently_bought_together WHERE product_id = ? AND bundle_product_id = ?";
        await db.promise.query(sql, [productId, bundleId]);
        res.json({ message: "Bundle removed successfully" });
    } catch (err) {
        console.error('❌ Error removing bundle:', err);
        res.status(500).json({ message: "Error removing bundle" });
    }
});

module.exports = router;
