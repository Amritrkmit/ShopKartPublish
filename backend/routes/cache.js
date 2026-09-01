const express = require('express');
const router = express.Router();
const redis = require('../utils/redis');
const requireAdminJWT = require('../middlewares/requireAdminJWT');

// Get current cache status (Approximate size or keys count)
router.get('/status', requireAdminJWT, async (req, res) => {
    try {
        if (!redis.isConnected()) {
            return res.json({ connected: false });
        }

        // Scan keys to categorize
        // Note: For large DBs, SCAN is preferred over KEYS, but for simple stats we use logic below
        const analyticsKeys = await redis.client.keys('analytics:*');
        const productKeys = await redis.client.keys('products:*');

        res.json({
            connected: true,
            analyticsCount: analyticsKeys.length,
            productCount: productKeys.length,
            allKeys: analyticsKeys.length + productKeys.length // Simplistic
        });

    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch cache status' });
    }
});

// Clear Specific Cache
router.post('/clear', requireAdminJWT, async (req, res) => {
    try {
        const { type } = req.body; // 'analytics', 'products', 'all'

        if (!redis.isConnected()) return res.status(503).json({ message: 'Redis not connected' });

        if (type === 'all') {
            await redis.flush();
            return res.json({ message: 'All caches cleared.' });
        }

        let pattern = '';
        if (type === 'analytics') pattern = 'analytics:*';
        else if (type === 'products') pattern = 'products:*';
        else return res.status(400).json({ message: 'Invalid cache type' });

        // Delete keys by pattern
        // KEYS is dangerous in prod with millions of keys, but fine for typical 1-instance usage
        const keys = await redis.client.keys(pattern);
        if (keys.length > 0) {
            await redis.client.del(keys);
        }

        res.json({ message: `Cleared ${keys.length} keys for ${type}.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during cache clear' });
    }
});

module.exports = router;
