import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Eye, Search, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const CustomizedOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/orders`, {
                params: {
                    page: currentPage,
                    limit: 10,
                    search: searchQuery,
                    has_customized_items: 'true'
                },
                withCredentials: true,
            });
            setOrders(res.data.orders);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error("Failed to fetch orders", err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchOrders]);

    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const statusColor = (status) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "processing": return "bg-blue-100 text-blue-700 border-blue-200";
            case "shipped": return "bg-indigo-100 text-indigo-700 border-indigo-200";
            case "delivered": return "bg-green-100 text-green-700 border-green-200";
            case "cancelled": return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const productionStatusColor = (status) => {
        switch (status) {
            case "pending": return "bg-orange-100 text-orange-700 border-orange-200";
            case "in_production": return "bg-purple-100 text-purple-700 border-purple-200";
            case "ready": return "bg-green-100 text-green-700 border-green-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <Wand2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Customized Orders</h1>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Monitor orders with personalized products</p>
                    </div>
                </div>
                <div className="text-sm text-gray-500">
                    Total: {pagination.total} orders
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search customized orders..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-orange-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Production Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-orange-50/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{order.order_id || "#" + order.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                        {(() => {
                                            try {
                                                let items = order.items;
                                                if (!items) return "No items data";

                                                // Deep parse logic
                                                let attempts = 0;
                                                while (typeof items === 'string' && attempts < 5) {
                                                    try {
                                                        items = JSON.parse(items);
                                                    } catch (e) {
                                                        try {
                                                            const sanitized = items.trim().replace(/\\"/g, '"');
                                                            if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
                                                                items = JSON.parse(sanitized.slice(1, -1));
                                                            } else {
                                                                items = JSON.parse(sanitized);
                                                            }
                                                        } catch (e2) {
                                                            return "Parse Error";
                                                        }
                                                    }
                                                    attempts++;
                                                }

                                                if (typeof items === 'object' && !Array.isArray(items) && items !== null) {
                                                    items = Object.values(items);
                                                }

                                                return Array.isArray(items) ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        {items.map((i, idx) => (
                                                            <div key={idx} className="flex flex-col">
                                                                <span className="truncate text-gray-800 font-medium">{i.name}</span>
                                                                {i.customization_details && <span className="text-[10px] text-orange-600 font-bold uppercase">Personalized</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : "Invalid format";
                                            } catch (e) { return "Error"; }
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded-full border uppercase ${productionStatusColor(order.production_status || 'pending')}`}>
                                            {order.production_status || 'pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-[10px] font-bold rounded-full border uppercase ${statusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <Link
                                            to={`/admin/orders/${order.urlToken || order.order_id || order.id}/`}
                                            className="text-orange-600 hover:text-orange-800 bg-orange-50 p-2 rounded-lg inline-block transition-colors"
                                        >
                                            <Eye size={18} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {loading && <div className="p-8 text-center text-gray-500">Loading customized orders...</div>}
            {!loading && orders.length === 0 && <div className="p-8 text-center text-gray-500 italic">No customized orders found.</div>}

            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-orange-100 px-6 py-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-orange-50 disabled:opacity-50 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium">Page {currentPage} of {pagination.totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                        disabled={currentPage === pagination.totalPages}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-orange-50 disabled:opacity-50 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CustomizedOrders;
