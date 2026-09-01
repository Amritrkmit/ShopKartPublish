import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toastError } from '../../utils/toast';
import { Eye, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ConsentHistory = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);

    // Pagination & Search State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [tempSearch, setTempSearch] = useState(''); // For input field

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/consent/logs`, {
                params: { page, limit: 20, search },
                withCredentials: true
            });
            // Handle new response structure { data, pagination } or fallback
            if (res.data.pagination) {
                setLogs(res.data.data);
                setTotalPages(res.data.pagination.totalPages);
            } else {
                setLogs(res.data); // Fallback for old API generic response
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            toastError("Failed to fetch consent logs");
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1); // Reset to page 1 on new search
        setSearch(tempSearch);
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">User Consent History</h1>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search IP, User Agent..."
                            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                            value={tempSearch}
                            onChange={(e) => setTempSearch(e.target.value)}
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Search
                    </button>
                    {search && (
                        <button
                            type="button"
                            onClick={() => { setSearch(''); setTempSearch(''); setPage(1); }}
                            className="text-gray-500 hover:text-gray-700 underline text-sm"
                        >
                            Clear
                        </button>
                    )}
                </form>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col h-full">
                {loading ? (
                    <div className="p-10 text-center text-gray-500">Loading logs...</div>
                ) : logs.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">No consent logs found matching your criteria.</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preferences</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.map((log) => {
                                        let prefs = {};
                                        try {
                                            prefs = typeof log.consent_data === 'string' ? JSON.parse(log.consent_data) : log.consent_data;
                                        } catch (e) { }

                                        return (
                                            <tr key={log.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{log.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user_id ? `User # [${log.username}] - [${log.email}]` : 'Guest'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ip_address}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <div className="flex gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-xs ${prefs.analytics ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            Analytics
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${prefs.marketing ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            Marketing
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <button
                                                        onClick={() => setSelectedLog(log)}
                                                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                                    >
                                                        <Eye size={16} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className={`flex items-center gap-1 px-3 py-1 rounded border ${page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}`}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <span className="text-sm text-gray-600">
                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </span>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                className={`flex items-center gap-1 px-3 py-1 rounded border ${page >= totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white hover:bg-gray-50'}`}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-800">Consent Details #{selectedLog.id}</h3>
                            <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">User Agent</label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded text-sm text-gray-600 break-words font-mono">
                                        {selectedLog.user_agent}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Consent Data (JSON)</label>
                                    <pre className="mt-1 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                                        {JSON.stringify(
                                            typeof selectedLog.consent_data === 'string'
                                                ? JSON.parse(selectedLog.consent_data)
                                                : selectedLog.consent_data,
                                            null, 2
                                        )}
                                    </pre>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">IP Address</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedLog.ip_address}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">User ID</label>
                                        <p className="mt-1 text-sm text-gray-900 font-semibold">{selectedLog.user_id || 'N/A'} [{selectedLog.username || 'N/A'}] [{selectedLog.email || 'N/A'}]</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConsentHistory;
