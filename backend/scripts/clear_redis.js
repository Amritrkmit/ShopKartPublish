const { client } = require('../utils/redis');

const clearCache = async () => {
    try {
        console.log("Connecting to Redis...");
        if (!client.isOpen) await client.connect();

        console.log("Flushing Redis cache...");
        await client.flushAll();

        console.log("✅ Cache cleared.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error clearing cache:", err);
        process.exit(1);
    }
};

clearCache();
