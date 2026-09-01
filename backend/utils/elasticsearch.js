const { Client } = require('@elastic/elasticsearch');
require('dotenv').config();

const esClient = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    maxRetries: 1,
    requestTimeout: 1000, // 1 second timeout
});

let isConnected = null;
let lastCheck = 0;
const CACHE_DURATION = 60000; // Cache status for 1 minute

const checkConnection = async () => {
    const now = Date.now();
    if (isConnected !== null && (now - lastCheck) < CACHE_DURATION) {
        return isConnected;
    }

    try {
        // Use a very light request to check health with a strict timeout
        const health = await esClient.cluster.health({ wait_for_status: 'yellow', timeout: '1s' });
        isConnected = true;
        lastCheck = now;
        console.log('🟢 Elasticsearch Connected:', health.status);
        return true;
    } catch (err) {
        isConnected = false;
        lastCheck = now;
        console.warn('🟡 Elasticsearch Connection Failed (Falling back to MySQL):', err.message);
        return false;
    }
};

module.exports = {
    esClient,
    checkConnection
};
