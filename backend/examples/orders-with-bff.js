/**
 * Example: Orders Route with BFF Pattern
 * 
 * This file demonstrates how to refactor order routes to use the BFF pattern.
 */

const express = require('express');
const router = express.Router();
const BFFService = require('../services/bff');
const { OrderDTO, ProductDTO } = require('../dtos');
const authMiddleware = require('../middlewares/userJWT');
const requireSeller = require('../middlewares/requireSeller');

// ==================== USER ORDER ROUTES ====================

/**
 * GET /api/orders
 * Get all orders for logged-in user (cleaned)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const orders = await BFFService.getUserOrders(req.user.id, {
            limit: parseInt(limit),
            offset,
            status
        });

        // Get total count for pagination
        const [countResult] = await db.promise.query(
            'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

/**
 * GET /api/orders/:id
 * Get single order by ID (cleaned)
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const order = await BFFService.getOrderById(req.params.id, req.user.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found or access denied' });
        }

        res.json({ order });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
});

/**
 * POST /api/orders/create
 * Create new order (with cleaned response)
 */
router.post('/create', authMiddleware, async (req, res) => {
    try {
        const { products, total, paymentId, shipping_address, coupon_code, coupon_discount, redeemed_points } = req.body;

        if (!products || !total || !paymentId) {
            return res.status(400).json({ message: 'Missing order details' });
        }

        // ... existing order creation logic ...
        // After creating the order:

        const orderId = result.insertId;

        // Fetch the created order using BFF to return cleaned data
        const createdOrder = await BFFService.getOrderById(orderId, req.user.id);

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: createdOrder // Cleaned order data
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Failed to create order' });
    }
});

// ==================== SELLER ORDER ROUTES ====================

/**
 * GET /api/orders/seller
 * Get orders for seller's shop (cleaned and filtered)
 */
router.get('/seller', requireSeller, async (req, res) => {
    try {
        const { limit = 50, status } = req.query;

        const orders = await BFFService.getSellerOrders(req.seller.id, {
            limit: parseInt(limit),
            status
        });

        res.json({
            success: true,
            orders,
            count: orders.length
        });
    } catch (error) {
        console.error('Error fetching seller orders:', error);
        res.status(500).json({ message: 'Failed to fetch seller orders' });
    }
});

/**
 * GET /api/orders/seller/:id
 * Get single order for seller (cleaned and filtered to seller's items)
 */
router.get('/seller/:id', requireSeller, async (req, res) => {
    try {
        const db = require('../db');

        // Get seller's shop ID
        const [shops] = await db.promise.query(
            'SELECT id FROM shops WHERE seller_id = ?',
            [req.seller.id]
        );

        if (shops.length === 0) {
            return res.status(404).json({ message: 'Seller shop not found' });
        }

        const shopId = shops[0].id;

        // Fetch order
        const isNumericId = /^\d+$/.test(req.params.id);
        let whereClause = '(o.order_id = ? OR o.url_token = ?)';
        let whereParams = [req.params.id, req.params.id];

        if (isNumericId) {
            whereClause = '(o.id = ? OR o.order_id = ? OR o.url_token = ?)';
            whereParams = [req.params.id, req.params.id, req.params.id];
        }

        const query = `
      SELECT o.*, 
             u.name as customer_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE ${whereClause}
    `;

        const [orders] = await db.promise.query(query, whereParams);

        if (orders.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orders[0];

        // Parse and filter items
        let allItems = [];
        try {
            allItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        } catch (e) {
            console.error('Order items parse error', e);
        }

        const shopItems = allItems.filter(item => String(item.shop_id) === String(shopId));

        if (shopItems.length === 0) {
            return res.status(404).json({ message: 'Order not found or access denied' });
        }

        // Calculate shop total
        const shopTotal = shopItems.reduce((sum, item) =>
            sum + (parseFloat(item.sale_price || item.price || 0) * (item.quantity || 1)), 0
        );

        // Clean the order data
        const cleanedOrder = OrderDTO.toPublic({
            ...order,
            items: shopItems
        });

        // Add seller-specific data (but don't expose customer email/phone for privacy)
        const responseOrder = {
            ...cleanedOrder,
            shop_total: shopTotal,
            customer: {
                name: order.customer_name
                // Email and phone are intentionally excluded for customer privacy
            }
        };

        res.json({ order: responseOrder });
    } catch (error) {
        console.error('Error fetching seller order:', error);
        res.status(500).json({ message: 'Failed to fetch order' });
    }
});

/**
 * PUT /api/orders/:id/status
 * Update order status (seller only)
 */
router.put('/:id/status', requireSeller, async (req, res) => {
    try {
        const { status, payment_status, production_status } = req.body;
        const db = require('../db');

        // Verify seller owns this order
        const [shops] = await db.promise.query(
            'SELECT id FROM shops WHERE seller_id = ?',
            [req.seller.id]
        );

        if (shops.length === 0) {
            return res.status(404).json({ message: 'Shop not found' });
        }

        const shopId = shops[0].id;

        // ... existing verification logic ...

        // Update the order
        // ... existing update logic ...

        // Return cleaned order data
        const updatedOrder = await BFFService.getOrderById(req.params.id, null);

        res.json({
            message: 'Order status updated',
            order: updatedOrder
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Failed to update order status' });
    }
});

/**
 * POST /api/orders/:id/cancel
 * Cancel order (user only)
 */
router.post('/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ message: 'Cancellation reason is required' });
        }

        // ... existing cancellation logic ...

        // After cancellation, return cleaned order
        const cancelledOrder = await BFFService.getOrderById(req.params.id, req.user.id);

        res.json({
            message: 'Order cancelled successfully',
            order: cancelledOrder
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
});

module.exports = router;
