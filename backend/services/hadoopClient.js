/**
 * Hadoop Client for Node.js
 * Provides interface to interact with HDFS via WebHDFS REST API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class HadoopClient {
    constructor(config = {}) {
        this.nameNodeUrl = config.nameNodeUrl || process.env.HADOOP_NAMENODE_URL || 'http://localhost:9870';
        this.user = config.user || 'root';
    }

    /**
     * Write data to HDFS
     * @param {string} hdfsPath - Path in HDFS (e.g., /data/orders/2026-01-12/data.json)
     * @param {string|Buffer} data - Data to write
     */
    async writeToHDFS(hdfsPath, data) {
        try {
            // Step 1: Create request to get redirect URL
            const createUrl = `${this.nameNodeUrl}/webhdfs/v1${hdfsPath}?op=CREATE&user.name=${this.user}&overwrite=true`;

            const createResponse = await axios.put(createUrl, null, {
                maxRedirects: 0,
                validateStatus: (status) => status === 307
            });

            // Step 2: Follow redirect to DataNode
            const dataNodeUrl = createResponse.headers.location;

            await axios.put(dataNodeUrl, data, {
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            });

            console.log(`✅ Successfully wrote to HDFS: ${hdfsPath}`);
            return { success: true, path: hdfsPath };
        } catch (error) {
            console.error(`❌ Failed to write to HDFS: ${hdfsPath}`, error.message);
            throw error;
        }
    }

    /**
     * Read data from HDFS
     * @param {string} hdfsPath - Path in HDFS
     */
    async readFromHDFS(hdfsPath) {
        try {
            const url = `${this.nameNodeUrl}/webhdfs/v1${hdfsPath}?op=OPEN&user.name=${this.user}`;
            const response = await axios.get(url, {
                maxRedirects: 5
            });

            console.log(`✅ Successfully read from HDFS: ${hdfsPath}`);
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to read from HDFS: ${hdfsPath}`, error.message);
            throw error;
        }
    }

    /**
     * List directory contents in HDFS
     * @param {string} hdfsPath - Directory path in HDFS
     */
    async listDirectory(hdfsPath) {
        try {
            const url = `${this.nameNodeUrl}/webhdfs/v1${hdfsPath}?op=LISTSTATUS&user.name=${this.user}`;
            const response = await axios.get(url);

            return response.data.FileStatuses.FileStatus;
        } catch (error) {
            console.error(`❌ Failed to list directory: ${hdfsPath}`, error.message);
            throw error;
        }
    }

    /**
     * Create directory in HDFS
     * @param {string} hdfsPath - Directory path to create
     */
    async createDirectory(hdfsPath) {
        try {
            const url = `${this.nameNodeUrl}/webhdfs/v1${hdfsPath}?op=MKDIRS&user.name=${this.user}`;
            await axios.put(url);

            console.log(`✅ Created directory: ${hdfsPath}`);
            return { success: true, path: hdfsPath };
        } catch (error) {
            console.error(`❌ Failed to create directory: ${hdfsPath}`, error.message);
            throw error;
        }
    }

    /**
     * Delete file or directory from HDFS
     * @param {string} hdfsPath - Path to delete
     * @param {boolean} recursive - Delete recursively
     */
    async delete(hdfsPath, recursive = false) {
        try {
            const url = `${this.nameNodeUrl}/webhdfs/v1${hdfsPath}?op=DELETE&user.name=${this.user}&recursive=${recursive}`;
            await axios.delete(url);

            console.log(`✅ Deleted from HDFS: ${hdfsPath}`);
            return { success: true };
        } catch (error) {
            console.error(`❌ Failed to delete: ${hdfsPath}`, error.message);
            throw error;
        }
    }

    /**
     * Check if path exists in HDFS
     * @param {string} hdfsPath - Path to check
     */
    async exists(hdfsPath) {
        try {
            const url = `${this.nameNodeUrl}/webhdfs/v1${hdfsPath}?op=GETFILESTATUS&user.name=${this.user}`;
            await axios.get(url);
            return true;
        } catch (error) {
            if (error.response?.status === 404) {
                return false;
            }
            throw error;
        }
    }
}

module.exports = HadoopClient;
