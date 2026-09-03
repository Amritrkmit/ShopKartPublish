import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Activity, RefreshCw, Eye, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const EventExplorer = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Pagination & Search State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [tempSearch, setTempSearch] = useState('');

    const fetchEvents = useCallback(async () => {
        try {
            // Only show full loading spinner on initial load or manual search, not auto-refresh
            if (!autoRefresh) setLoading(true);

            const res = await axios.get(`${API_BASE_URL}/api/events/admin`, {
                params: { page, limit: 20, search },
                withCredentials: true
            });

            if (res.data.pagination) {
                setEvents(res.data.data);
                setTotalPages(res.data.pagination.totalPages);
            } else {
                setEvents(res.data);
            }
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }, [page, search, autoRefresh]);

    useEffect(() => {
        fetchEvents();
        let interval;
        if (autoRefresh) {
            interval = setInterval(fetchEvents, 5000);
        }
        return () => clearInterval(interval);
    }, [fetchEvents, autoRefresh]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setSearch(tempSearch);
    };

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Activity className="text-blue-600" /> Event Explorer
                </h1>

                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full">
                            <input
                                type="text"
                                placeholder="Search Event, URL..."
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
                                className="text-gray-500 hover:text-gray-700 underline text-sm whitespace-nowrap"
                            >
                                Clear
                            </button>
                        )}
                    </form>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`flex items-center gap-2 px-3 py-2 rounded border text-sm font-medium transition-colors whitespace-nowrap
                                ${autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                        >
                            <RefreshCw size={16} className={autoRefresh ? 'animate-spin' : ''} />
                            {autoRefresh ? 'Live' : 'Live Off'}
                        </button>
                        <button
                            onClick={() => fetchEvents()}
                            className="bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col min-h-[400px]">
                {loading && !autoRefresh ? (
                    <div className="p-10 text-center text-gray-500">Loading events...</div>
                ) : events.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">No events found matching your criteria.</div>
                ) : (
                    <>
                        <div className="overflow-x-auto flex-grow">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User / Session</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {events.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(event.created_at).toLocaleTimeString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {event.event_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-[200px]" title={event.page_url}>
                                                {event.page_url}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex flex-col">
                                                    <span>{event.user_id ? `User # [ ${event.username} ] ` : 'Guest'}</span>
                                                    <span className="text-xs text-gray-400 font-mono" title={event.email}>
                                                        {event.email ? `${event.email}` : 'N/A'}
                                                    </span>
                                                    <span className="text-xs text-gray-400 font-mono" title={event.session_id}>
                                                        {event.session_id.substring(0, 8)}...
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => setSelectedEvent(event)} className="text-blue-600 hover:text-blue-900">
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
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

            {/* Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Activity size={20} className="text-blue-600" />
                                Event Details #{selectedEvent.id}
                            </h3>
                            <button onClick={() => setSelectedEvent(null)}><X size={24} className="text-gray-500" /></button>
                        </div>
                        <div className="overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Event Name</label>
                                    <p className="text-lg font-medium">{selectedEvent.event_name}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Timestamp</label>
                                    <p className="text-gray-900">{new Date(selectedEvent.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Page URL</label>
                                <p className="text-gray-900 break-all bg-gray-50 p-2 rounded border text-sm">{selectedEvent.page_url}</p>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">CSS Selector</label>
                                <code className="block bg-gray-900 text-green-400 p-3 rounded text-xs break-all">
                                    {selectedEvent.element_selector}
                                </code>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Metadata</label>
                                <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto text-gray-700 font-mono">
                                    {JSON.stringify(
                                        typeof selectedEvent.metadata === 'string'
                                            ? JSON.parse(selectedEvent.metadata)
                                            : selectedEvent.metadata,
                                        null, 2
                                    )}
                                </pre>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setSelectedEvent(null)}
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

export default EventExplorer;
