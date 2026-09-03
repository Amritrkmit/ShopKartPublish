import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toastSuccess, toastError } from '../../utils/toast';
import ConfirmationModal from '../../components/ConfirmationModal';


const CacheManagement = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ show: false, type: null });

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL || ""}/api/cache/status`, {
                withCredentials: true
            });
            setStatus(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const initiateClearCache = (type) => {
        setConfirmModal({ show: true, type });
    };

    const confirmClearCache = async () => {
        const type = confirmModal.type;
        if (!type) return;

        setLoading(true);
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL || ""}/api/cache/clear`, { type }, {
                withCredentials: true
            });
            toastSuccess(res.data.message);
            fetchStatus(); // Refresh stats
        } catch (error) {
            toastError("Failed to clear cache");
            console.error(error);
        } finally {
            setLoading(false);
            setConfirmModal({ show: false, type: null });
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen animate-fade-in-up">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">System Cache Management</h1>

            {/* Connection Status */}
            <div className={`p-4 rounded-lg border mb-8 flex flex-col gap-2 ${status?.connected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                    <span className="font-bold text-lg">
                        {status?.connected ? 'Redis Cache Server is Connected' : 'Redis Cache is Inactive'}
                    </span>
                </div>
                {!status?.connected && (
                    <div className="ml-6 text-sm text-orange-800 mt-1">
                        <p>The system is currently running in <strong>Direct Database Mode</strong>. This is normal if Redis is not installed.</p>
                        <p className="mt-2 text-xs text-orange-600">
                            To enable caching (optional): Install Redis via <code>brew install redis</code> and start it with <code>brew services start redis</code>.
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Analytics Cache Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Analytics Cache</h3>
                            <p className="text-sm text-gray-500 mt-1">High-volume dashboard and chart data.</p>
                        </div>
                        <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                            {status?.analyticsCount || 0} Keys
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            onClick={() => initiateClearCache('analytics')}
                            disabled={loading || !status?.connected}
                            className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Clearing...' : 'Clear Analytics Data'}
                        </button>
                    </div>
                </div>

                {/* Products Cache Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800">Product Listings</h3>
                            <p className="text-sm text-gray-500 mt-1">Catalog pages, filters, and search results.</p>
                        </div>
                        <div className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded">
                            {status?.productCount || 0} Keys
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            onClick={() => initiateClearCache('products')}
                            disabled={loading || !status?.connected}
                            className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Clearing...' : 'Clear Product Cache'}
                        </button>
                    </div>
                </div>

                {/* Global Purge Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-red-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-red-800">Global System Purge</h3>
                            <p className="text-sm text-red-600 mt-1">Clear absolutely everything from Redis.</p>
                        </div>
                        <div className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">
                            ALL
                        </div>
                    </div>
                    <div className="mt-6">
                        <button
                            onClick={() => initiateClearCache('all')}
                            disabled={loading || !status?.connected}
                            className="w-full py-2 px-4 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {loading ? 'Purging...' : 'Flush Entire Cache'}
                        </button>
                    </div>
                </div>

            </div>

            <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                <strong>Note:</strong> Clearing cache will force the system to fetch fresh data from the database on next request. This may temporarily increase load times for users.
            </div>

            <ConfirmationModal
                isOpen={confirmModal.show}
                onClose={() => setConfirmModal({ show: false, type: null })}
                onConfirm={confirmClearCache}
                title={`Clear ${confirmModal.type === 'all' ? 'All' : (confirmModal.type?.charAt(0).toUpperCase() + confirmModal.type?.slice(1))} Cache?`}
                message={`Are you sure you want to clear the ${confirmModal.type === 'all' ? 'entire system' : confirmModal.type} cache? This action cannot be undone.`}
                confirmText="Clear Cache"
                isDelete={true}
            />
        </div>
    );
};

export default CacheManagement;
