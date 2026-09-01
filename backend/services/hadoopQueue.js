/**
 * Hadoop Queue Service
 * Handles async data ingestion to HDFS using Bull queue
 */

const Queue = require('bull');
const HadoopClient = require('./hadoopClient');

const hadoopClient = new HadoopClient();

// Create queue (uses Redis)
const hadoopQueue = new Queue('hadoop-ingestion', process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Process queue jobs
 */
hadoopQueue.process(async (job) => {
    const { type, data, timestamp } = job.data;

    try {
        // Generate HDFS path based on type and date
        const date = new Date(timestamp).toISOString().split('T')[0];
        const hdfsPath = `/data/${type}/${date}/${job.id}.json`;

        // Ensure directory exists
        const dirPath = `/data/${type}/${date}`;
        const exists = await hadoopClient.exists(dirPath);
        if (!exists) {
            await hadoopClient.createDirectory(dirPath);
        }

        // Write to HDFS
        await hadoopClient.writeToHDFS(hdfsPath, JSON.stringify(data));

        console.log(`✅ [Hadoop Queue] Successfully ingested ${type} to HDFS: ${hdfsPath}`);
        return { success: true, path: hdfsPath };
    } catch (error) {
        console.error(`❌ [Hadoop Queue] Failed to ingest ${type}:`, error.message);
        throw error; // Will trigger retry
    }
});

/**
 * Add data to Hadoop ingestion queue
 * @param {string} type - Data type (e.g., 'orders', 'clickstream', 'reviews')
 * @param {object} data - Data to ingest
 */
exports.queueForHadoop = async (type, data) => {
    try {
        const job = await hadoopQueue.add({
            type,
            data,
            timestamp: Date.now()
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            },
            removeOnComplete: true,
            removeOnFail: false
        });

        console.log(`📤 [Hadoop Queue] Queued ${type} for ingestion (Job ID: ${job.id})`);
        return job.id;
    } catch (error) {
        console.error(`❌ [Hadoop Queue] Failed to queue ${type}:`, error.message);
        // Don't throw - we don't want to block the main application
        return null;
    }
};

/**
 * Get queue statistics
 */
exports.getQueueStats = async () => {
    const [waiting, active, completed, failed] = await Promise.all([
        hadoopQueue.getWaitingCount(),
        hadoopQueue.getActiveCount(),
        hadoopQueue.getCompletedCount(),
        hadoopQueue.getFailedCount()
    ]);

    return { waiting, active, completed, failed };
};

// Export queue for monitoring
exports.hadoopQueue = hadoopQueue;
