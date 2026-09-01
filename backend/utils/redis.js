const redis = require('redis');

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: retries => {
            if (retries > 5) {
                console.log('Too many attempts to reconnect. Redis connection disabled.');
                return new Error('Too many retries.');
            }
            return Math.min(retries * 50, 500);
        }
    }
});

let isConnected = false;

client.on('error', (err) => {
    // Only log operational errors to avoid spamming 
    if (err.code !== 'ECONNREFUSED') console.warn('Redis Client Error:', err.message);
    isConnected = false;
});

client.on('connect', () => {
    console.log('Redis Client Connected');
    isConnected = true;
});

(async () => {
    try {
        await client.connect();
    } catch (e) {
        // Ignored, handled by error listener
    }
})();

module.exports = {
    client,
    get: async (key) => {
        if (!isConnected) return null;
        try {
            return await client.get(key);
        } catch (e) {
            return null;
        }
    },
    set: async (key, value, options) => {
        if (!isConnected) return;
        try {
            await client.set(key, value, options);
        } catch (e) { }
    },
    del: async (key) => {
        if (!isConnected) return;
        try {
            await client.del(key);
        } catch (e) { }
    },
    flush: async () => {
        if (!isConnected) return;
        try {
            await client.flushAll();
        } catch (e) { }
    },
    isConnected: () => isConnected
};
