# Hadoop Big Data Integration

This directory contains the Hadoop cluster configuration and related tools for big data analytics.

## Quick Start

### 1. Start Hadoop Cluster

```bash
cd hadoop
docker-compose up -d
```

This will start:
- **HDFS NameNode** (Web UI: http://localhost:9870)
- **HDFS DataNode** (Web UI: http://localhost:9864)
- **Spark Master** (Web UI: http://localhost:8080)
- **Spark Worker** (Web UI: http://localhost:8081)
- **Hive Server** (Port: 10000)
- **Hive Metastore** (Port: 9083)

### 2. Verify Cluster is Running

```bash
# Check all containers are up
docker-compose ps

# Check HDFS health
curl http://localhost:9870/jmx?qry=Hadoop:service=NameNode,name=NameNodeStatus

# Check Spark health
curl http://localhost:8080
```

### 3. Test HDFS Operations

```bash
cd ../backend

# Test Hadoop client
node -e "
const HadoopClient = require('./services/hadoopClient');
const client = new HadoopClient();

(async () => {
    // Create directory
    await client.createDirectory('/test');
    
    // Write file
    await client.writeToHDFS('/test/hello.txt', 'Hello Hadoop!');
    
    // Read file
    const data = await client.readFromHDFS('/test/hello.txt');
    console.log('Read from HDFS:', data);
    
    // List directory
    const files = await client.listDirectory('/test');
    console.log('Files:', files);
})();
"
```

### 4. Run Batch Export

```bash
cd backend

# Export yesterday's orders to HDFS
node scripts/batchExport.js yesterday

# Export last 30 days
node scripts/batchExport.js last30days

# Export specific date range
node scripts/batchExport.js range 2026-01-01 2026-01-31
```

## Architecture

```
Application → Memcached (cache) → MySQL (transactional)
     ↓
Hadoop Queue (async)
     ↓
HDFS (storage) → Spark (processing) → Results
```

## Data Flow

### Real-Time Ingestion (Queue)

```javascript
const { queueForHadoop } = require('./services/hadoopQueue');

// Queue order for Hadoop ingestion (non-blocking)
await queueForHadoop('orders', orderData);
```

### Batch Export (Scheduled)

```bash
# Add to crontab for daily export at 2 AM
0 2 * * * cd /path/to/backend && node scripts/batchExport.js yesterday
```

## Web UIs

- **HDFS NameNode**: http://localhost:9870
  - View HDFS filesystem
  - Monitor cluster health
  - Check storage usage

- **Spark Master**: http://localhost:8080
  - View running jobs
  - Monitor workers
  - Check resource usage

- **Spark Worker**: http://localhost:8081
  - View worker status
  - Check executors

## HDFS Directory Structure

```
/data/
  ├── orders/
  │   ├── 2026-01-01/
  │   │   └── orders.jsonl
  │   ├── 2026-01-02/
  │   └── ...
  ├── clickstream/
  │   └── ...
  └── reviews/
      └── ...

/analytics/
  ├── daily_sales/
  ├── user_behavior/
  └── recommendations/
```

## Spark Jobs

Spark jobs are located in `spark_jobs/` directory.

### Run a Spark Job

```bash
# Submit Spark job
docker exec -it spark-master spark-submit \
  --master spark://spark-master:7077 \
  /path/to/spark_job.py
```

## Troubleshooting

### Cluster won't start

```bash
# Check logs
docker-compose logs namenode
docker-compose logs datanode

# Restart cluster
docker-compose down
docker-compose up -d
```

### HDFS is full

```bash
# Check HDFS usage
curl http://localhost:9870/jmx?qry=Hadoop:service=NameNode,name=FSNamesystem

# Delete old data
node -e "
const HadoopClient = require('./backend/services/hadoopClient');
const client = new HadoopClient();
client.delete('/data/orders/2025-01-01', true);
"
```

### Queue is stuck

```bash
# Check queue stats
node -e "
const { getQueueStats } = require('./backend/services/hadoopQueue');
getQueueStats().then(console.log);
"

# Clear failed jobs
# (Use Bull Board or Redis CLI)
```

## Environment Variables

Add to `backend/.env`:

```bash
# Hadoop Configuration
HADOOP_NAMENODE_URL=http://localhost:9870
HADOOP_USER=root

# Redis for Queue
REDIS_URL=redis://localhost:6379
```

## Next Steps

1. ✅ Cluster is running
2. ✅ Test HDFS operations
3. ✅ Run batch export
4. 🔄 Create first Spark analytics job
5. 🔄 Integrate with Express API
6. 🔄 Build admin analytics dashboard

## Resources

- [Hadoop Documentation](https://hadoop.apache.org/docs/)
- [Spark Documentation](https://spark.apache.org/docs/latest/)
- [WebHDFS REST API](https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/WebHDFS.html)
