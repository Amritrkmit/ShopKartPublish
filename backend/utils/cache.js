const memjs = require('memjs');

// Connect to Memcached on default localhost:11211
// In production, this can be configured via MEMCACHED_SERVERS env var
const client = memjs.Client.create(process.env.MEMCACHED_SERVERS || 'localhost:11211', {
    timeout: 1,
    retries: 2
});

/**
 * Set a value in the cache
 * @param {string} key 
 * @param {any} data - Will be JSON stringified
 * @param {number} ttl - Time to live in seconds (default 3600)
 */
exports.set = async (key, data, ttl = 3600) => {
    try {
        if (!client) return;
        return await client.set(key, JSON.stringify(data), { expires: ttl });
    } catch (err) {
        console.error("Memcached SET error:", err.message);
        // Fail silent, caching is enhancement not critical
        return null;
    }
};

/**
 * Get a value from the cache
 * @param {string} key 
 * @returns {any} - Parsed JSON data or null
 */
exports.get = async (key) => {
    try {
        if (!client) return null;
        const { value } = await client.get(key);
        if (!value) return null;
        return JSON.parse(value.toString());
    } catch (err) {
        // Log connection errors but don't crash app
        // console.warn("Memcached GET error:", err.message);
        return null;
    }
};

/**
 * Delete a key from the cache
 * @param {string} key 
 */
exports.del = async (key) => {
    try {
        if (!client) return;
        return await client.delete(key);
    } catch (err) {
        console.error("Memcached DEL error:", err.message);
    }
};

/**
 * Flush all cache
 */
exports.flush = async () => {
    try {
        if (!client) return;
        return await client.flush();
    } catch (err) {
        console.error("Memcached FLUSH error:", err.message);
    }
};
