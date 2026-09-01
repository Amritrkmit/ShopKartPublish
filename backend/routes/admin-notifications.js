const express = require('express');
const router = express.Router();
const db = require('../db').promise; // Use promise-based pool

const requireAdmin = require('../middlewares/requireAdmin');

// GET /admin/notifications - Fetch all notifications for admin
router.get('/notifications', requireAdmin, async (req, res) => {
    try {
        // Fetch recent orders (last 24 hours)
        const [orders] = await db.query(`
      SELECT 
        o.id as order_id,
        o.created_at,
        u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

        // Fetch recent reviews (last 24 hours)
        const [reviews] = await db.query(`
      SELECT 
        r.id as review_id,
        r.rating,
        r.comment,
        r.created_at,
        u.name as user_name,
        p.name as product_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN products p ON r.product_id = p.id
      WHERE r.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY r.created_at DESC
      LIMIT 10
    `);

        // Fetch recent chat messages (last 24 hours)
        const [chatMessages] = await db.query(`
      SELECT 
        m.id as message_id,
        m.message,
        m.created_at,
        t.subject,
        u.name as user_name,
        t.id as ticket_id
      FROM messages m
      LEFT JOIN tickets t ON m.ticket_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE m.sender = 'user' 
        AND m.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY m.created_at DESC
      LIMIT 10
    `);

        // Transform data into notification format
        const notifications = [];

        // Add order notifications
        orders.forEach(order => {
            notifications.push({
                id: `order-${order.order_id}`,
                type: 'order',
                userName: order.user_name || 'Customer',
                userAvatar: null,
                action: 'placed a new order',
                message: `Order #${order.order_id}`,
                time: order.created_at,
                read: false,
            });
        });

        // Add review notifications
        reviews.forEach(review => {
            notifications.push({
                id: `review-${review.review_id}`,
                type: 'review',
                userName: review.user_name || 'User',
                userAvatar: null,
                action: `left a ${review.rating}-star review`,
                message: review.comment?.substring(0, 50) || `Review for ${review.product_name}`,
                time: review.created_at,
                read: false,
            });
        });

        // Add chat notifications
        chatMessages.forEach(msg => {
            notifications.push({
                id: `chat-${msg.message_id}`,
                type: 'chat',
                userName: msg.user_name || 'User',
                userAvatar: null,
                action: 'sent you a message',
                message: msg.message?.substring(0, 50) + (msg.message?.length > 50 ? '...' : ''),
                time: msg.created_at,
                read: false,
            });
        });

        // Sort by time (most recent first)
        notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({
            success: true,
            notifications: notifications.slice(0, 20), // Limit to 20 most recent
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            notifications: [],
        });
    }
});

// POST /admin/notifications/mark-read - Mark notification as read
router.post('/notifications/mark-read/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // In a real implementation, you would update a notifications table
        // For now, just return success
        res.json({
            success: true,
            message: 'Notification marked as read',
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
        });
    }
});

// POST /admin/notifications/mark-all-read - Mark all notifications as read
router.post('/notifications/mark-all-read', requireAdmin, async (req, res) => {
    try {
        // In a real implementation, you would update a notifications table
        // For now, just return success
        res.json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
        });
    }
});

module.exports = router;
