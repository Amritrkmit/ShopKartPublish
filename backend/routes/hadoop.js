/**
 * Hadoop Management API
 * Provides endpoints for managing Hadoop cluster, batch exports, and Spark jobs
 */

const express = require('express');
const router = express.Router();
const requireAdminJWT = require('../middlewares/requireAdminJWT');
const HadoopClient = require('../services/hadoopClient');
const { getQueueStats, hadoopQueue } = require('../services/hadoopQueue');
const { exportOrders, exportClickstream, exportReviews, exportSalesAggregates, exportAll } = require('../scripts/batchExport');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const hadoopClient = new HadoopClient();

/**
 * Get Hadoop cluster health status
 */
router.get('/health', requireAdminJWT, async (req, res) => {
    const health = {
        hdfs: 'unknown',
        spark: 'unknown',
        queue: 'unknown',
        timestamp: new Date().toISOString()
    };

    // Check HDFS health
    try {
        const exists = await hadoopClient.exists('/');
        health.hdfs = exists ? 'healthy' : 'unhealthy';
    } catch (error) {
        health.hdfs = 'unhealthy';
        health.hdfs_error = error.message;
    }

    // Check Spark health (via HTTP)
    try {
        const axios = require('axios');
        const sparkResponse = await axios.get('http://localhost:8080', { timeout: 5000 });
        health.spark = sparkResponse.status === 200 ? 'healthy' : 'unhealthy';
    } catch (error) {
        health.spark = 'unhealthy';
        health.spark_error = error.message;
    }

    // Check Queue health
    try {
        const queueStats = await getQueueStats();
        health.queue = 'healthy';
        health.queue_stats = queueStats;
    } catch (error) {
        health.queue = 'unhealthy';
        health.queue_error = error.message;
    }

    // Always return JSON response
    res.json(health);
});

/**
 * Trigger batch export
 */
router.post('/export', requireAdminJWT, async (req, res) => {
    try {
        const { type, startDate, endDate } = req.body;

        if (!type || !startDate || !endDate) {
            return res.status(400).json({
                error: 'Missing required fields: type, startDate, endDate'
            });
        }

        let exportFunc;
        switch (type) {
            case 'orders':
                exportFunc = exportOrders;
                break;
            case 'clickstream':
                exportFunc = exportClickstream;
                break;
            case 'reviews':
                exportReviews;
                break;
            case 'sales':
                exportFunc = exportSalesAggregates;
                break;
            case 'all':
                exportFunc = exportAll;
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid export type. Valid types: orders, clickstream, reviews, sales, all'
                });
        }

        // Run export asynchronously
        exportFunc(startDate, endDate)
            .then(result => {
                console.log(`✅ Export completed: ${type}`, result);
            })
            .catch(error => {
                console.error(`❌ Export failed: ${type}`, error);
            });

        res.json({
            success: true,
            message: `Export started for ${type} from ${startDate} to ${endDate}`,
            type,
            startDate,
            endDate
        });

    } catch (error) {
        console.error('Export trigger error:', error);
        res.status(500).json({ error: 'Failed to trigger export' });
    }
});

/**
 * Submit Spark job
 */
router.post('/spark/submit', requireAdminJWT, async (req, res) => {
    try {
        const { job, date } = req.body;

        if (!job || !date) {
            return res.status(400).json({
                error: 'Missing required fields: job, date'
            });
        }

        const validJobs = ['daily_sales', 'clickstream', 'behavior', 'recommendations'];
        if (!validJobs.includes(job)) {
            return res.status(400).json({
                error: `Invalid job type. Valid jobs: ${validJobs.join(', ')}`
            });
        }

        // Map job names to Python files
        const jobFiles = {
            'daily_sales': 'daily_sales.py',
            'clickstream': 'clickstream_analysis.py',
            'behavior': 'customer_behavior.py',
            'recommendations': 'product_recommendations.py'
        };

        const jobFile = jobFiles[job];
        const command = `docker exec spark-master spark-submit --master spark://spark-master:7077 /spark_jobs/${jobFile} ${date}`;

        // Execute Spark job asynchronously
        execPromise(command)
            .then(({ stdout, stderr }) => {
                console.log(`✅ Spark job completed: ${job}`);
                console.log('STDOUT:', stdout);
                if (stderr) console.log('STDERR:', stderr);
            })
            .catch(error => {
                console.error(`❌ Spark job failed: ${job}`, error);
            });

        res.json({
            success: true,
            message: `Spark job submitted: ${job} for date ${date}`,
            job,
            date,
            command
        });

    } catch (error) {
        console.error('Spark job submission error:', error);
        res.status(500).json({ error: 'Failed to submit Spark job' });
    }
});

/**
 * Get Spark job status (list running jobs)
 */
router.get('/spark/jobs', requireAdminJWT, async (req, res) => {
    try {
        const axios = require('axios');
        const sparkResponse = await axios.get('http://localhost:8080/json/', { timeout: 5000 });

        res.json({
            success: true,
            jobs: sparkResponse.data
        });
    } catch (error) {
        console.error('Spark jobs fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch Spark jobs' });
    }
});

/**
 * Get analytics results from HDFS
 */
router.get('/analytics/:type/:date', requireAdminJWT, async (req, res) => {
    try {
        const { type, date } = req.params;

        const validTypes = ['daily_sales', 'user_behavior', 'recommendations'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid analytics type. Valid types: ${validTypes.join(', ')}`
            });
        }

        const hdfsPath = `/analytics/${type}/${date}`;

        // List directories in analytics path
        const files = await hadoopClient.listDirectory(hdfsPath);

        res.json({
            success: true,
            type,
            date,
            path: hdfsPath,
            files: files.map(f => ({
                name: f.pathSuffix,
                type: f.type,
                size: f.length,
                modified: f.modificationTime
            }))
        });

    } catch (error) {
        console.error('Analytics fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics results' });
    }
});

/**
 * Get queue statistics
 */
router.get('/queue/stats', requireAdminJWT, async (req, res) => {
    try {
        const stats = await getQueueStats();

        // Get failed jobs for inspection
        const failedJobs = await hadoopQueue.getFailed(0, 10);

        res.json({
            success: true,
            stats,
            failed_jobs: failedJobs.map(job => ({
                id: job.id,
                data: job.data,
                failedReason: job.failedReason,
                attemptsMade: job.attemptsMade,
                timestamp: job.timestamp
            }))
        });

    } catch (error) {
        console.error('Queue stats error:', error);
        res.status(500).json({ error: 'Failed to fetch queue statistics' });
    }
});

/**
 * Browse HDFS directories
 */
router.get('/hdfs/browse', requireAdminJWT, async (req, res) => {
    try {
        const { path } = req.query;

        if (!path) {
            return res.status(400).json({ error: 'Missing required parameter: path' });
        }

        const files = await hadoopClient.listDirectory(path);

        res.json({
            success: true,
            path,
            files: files.map(f => ({
                name: f.pathSuffix,
                type: f.type,
                size: f.length,
                modified: new Date(f.modificationTime).toISOString(),
                permissions: f.permission,
                owner: f.owner,
                group: f.group
            }))
        });

    } catch (error) {
        console.error('HDFS browse error:', error);
        res.status(500).json({ error: 'Failed to browse HDFS directory' });
    }
});

/**
 * Get HDFS storage stats
 */
router.get('/hdfs/stats', requireAdminJWT, async (req, res) => {
    try {
        const axios = require('axios');
        const nameNodeUrl = process.env.HADOOP_NAMENODE_URL || 'http://localhost:9870';

        // Get HDFS stats from NameNode JMX
        const jmxResponse = await axios.get(`${nameNodeUrl}/jmx?qry=Hadoop:service=NameNode,name=FSNamesystem`);
        const fsStats = jmxResponse.data.beans[0];

        res.json({
            success: true,
            capacity: {
                total: fsStats.CapacityTotal,
                used: fsStats.CapacityUsed,
                remaining: fsStats.CapacityRemaining,
                usage_percent: ((fsStats.CapacityUsed / fsStats.CapacityTotal) * 100).toFixed(2)
            },
            blocks: {
                total: fsStats.BlocksTotal,
                missing: fsStats.MissingBlocks,
                corrupt: fsStats.CorruptBlocks
            },
            files: {
                total: fsStats.FilesTotal,
                under_replicated: fsStats.UnderReplicatedBlocks
            },
            nodes: {
                live: fsStats.NumLiveDataNodes,
                dead: fsStats.NumDeadDataNodes
            }
        });

    } catch (error) {
        console.error('HDFS stats error:', error);
        res.status(500).json({ error: 'Failed to fetch HDFS statistics' });
    }
});

/**
 * Retry failed queue jobs
 */
router.post('/queue/retry/:jobId', requireAdminJWT, async (req, res) => {
    try {
        const { jobId } = req.params;

        const job = await hadoopQueue.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        await job.retry();

        res.json({
            success: true,
            message: `Job ${jobId} queued for retry`,
            jobId
        });

    } catch (error) {
        console.error('Queue retry error:', error);
        res.status(500).json({ error: 'Failed to retry job' });
    }
});

/**
 * Clean failed queue jobs
 */
router.post('/queue/clean', requireAdminJWT, async (req, res) => {
    try {
        await hadoopQueue.clean(0, 'failed');

        res.json({
            success: true,
            message: 'Failed jobs cleaned successfully'
        });

    } catch (error) {
        console.error('Queue clean error:', error);
        res.status(500).json({ error: 'Failed to clean queue' });
    }
});

module.exports = router;
