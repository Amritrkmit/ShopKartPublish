import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, CheckCircle, XCircle, Clock, Database, Activity } from 'lucide-react';

const HadoopMonitor = () => {
    const [health, setHealth] = useState(null);
    const [queueStats, setQueueStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminUser');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch cluster health
            const healthRes = await axios.get('/api/hadoop/health', { headers });
            setHealth(healthRes.data);

            // Fetch queue stats
            const queueRes = await axios.get('/api/hadoop/queue/stats', { headers });
            setQueueStats(queueRes.data);

            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        if (status === 'healthy') return 'text-green-600 bg-green-50 border-green-200';
        if (status === 'unhealthy') return 'text-red-600 bg-red-50 border-red-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const getStatusIcon = (status) => {
        if (status === 'healthy') return <CheckCircle className="w-5 h-5" />;
        if (status === 'unhealthy') return <XCircle className="w-5 h-5" />;
        return <Clock className="w-5 h-5" />;
    };

    if (loading && !health) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Hadoop Cluster Monitor</h1>
                    <p className="text-gray-600 mt-1">Real-time monitoring of Hadoop data pipeline</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">
                        <strong>Error:</strong> {error}
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                        Make sure Docker is running and Hadoop cluster is started.
                    </p>
                </div>
            )}

            {/* Cluster Health */}
            {health && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* HDFS Status */}
                    <div className={`p-4 rounded-lg border-2 ${getStatusColor(health.hdfs)}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Database className="w-5 h-5" />
                                <h3 className="font-semibold">HDFS</h3>
                            </div>
                            {getStatusIcon(health.hdfs)}
                        </div>
                        <p className="text-sm capitalize">{health.hdfs}</p>
                        {health.hdfs_error && (
                            <p className="text-xs mt-1 opacity-75">{health.hdfs_error}</p>
                        )}
                    </div>

                    {/* Spark Status */}
                    <div className={`p-4 rounded-lg border-2 ${getStatusColor(health.spark)}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5" />
                                <h3 className="font-semibold">Spark</h3>
                            </div>
                            {getStatusIcon(health.spark)}
                        </div>
                        <p className="text-sm capitalize">{health.spark}</p>
                        {health.spark_error && (
                            <p className="text-xs mt-1 opacity-75">{health.spark_error}</p>
                        )}
                    </div>

                    {/* Queue Status */}
                    <div className={`p-4 rounded-lg border-2 ${getStatusColor(health.queue)}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                <h3 className="font-semibold">Queue</h3>
                            </div>
                            {getStatusIcon(health.queue)}
                        </div>
                        <p className="text-sm capitalize">{health.queue}</p>
                        {health.queue_error && (
                            <p className="text-xs mt-1 opacity-75">{health.queue_error}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Queue Statistics */}
            {queueStats && queueStats.stats && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">Queue Statistics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-700 font-medium">Waiting</p>
                            <p className="text-3xl font-bold text-yellow-900">{queueStats.stats.waiting}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-700 font-medium">Active</p>
                            <p className="text-3xl font-bold text-blue-900">{queueStats.stats.active}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-700 font-medium">Completed</p>
                            <p className="text-3xl font-bold text-green-900">{queueStats.stats.completed}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-sm text-red-700 font-medium">Failed</p>
                            <p className="text-3xl font-bold text-red-900">{queueStats.stats.failed}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Failed Jobs */}
            {queueStats && queueStats.failed_jobs && queueStats.failed_jobs.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4 text-red-600">Failed Jobs</h2>
                    <div className="space-y-3">
                        {queueStats.failed_jobs.map((job) => (
                            <div key={job.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-semibold text-red-900">Job #{job.id}</p>
                                        <p className="text-sm text-red-700">Attempts: {job.attemptsMade}</p>
                                    </div>
                                    <span className="text-xs text-red-600">
                                        {new Date(job.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-red-800 mb-2">
                                    <strong>Reason:</strong> {job.failedReason}
                                </p>
                                <details className="text-xs text-red-700">
                                    <summary className="cursor-pointer hover:underline">View Data</summary>
                                    <pre className="mt-2 p-2 bg-red-100 rounded overflow-x-auto">
                                        {JSON.stringify(job.data, null, 2)}
                                    </pre>
                                </details>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                    <strong>💡 Note:</strong> This dashboard shows real-time queue activity.
                    {health?.hdfs === 'unhealthy' && (
                        <span className="block mt-1">
                            HDFS is currently unavailable. Install Docker and start the Hadoop cluster to enable data ingestion.
                        </span>
                    )}
                </p>
            </div>
        </div>
    );
};

export default HadoopMonitor;
