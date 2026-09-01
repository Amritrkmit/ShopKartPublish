import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Eye, Search, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toastError } from "../../utils/toast";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerCustomizedOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("sellerToken");
            const res = await axios.get(`${API_BASE_URL}/orders/seller`, {
                params: {
                    limit: 50,
                    has_customized_items: 'true'
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            const allOrders = res.data.orders || [];

            let filtered = allOrders;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                filtered = allOrders.filter(o =>
                    o.id.toString().includes(q) ||
                    (o.customer?.name || "").toLowerCase().includes(q) ||
                    (o.customer?.email || "").toLowerCase().includes(q)
                );
            }

            setPagination({
                page: currentPage,
                limit: 10,
                total: filtered.length,
                totalPages: Math.ceil(filtered.length / 10)
            });

            const startIndex = (currentPage - 1) * 10;
            setOrders(filtered.slice(startIndex, startIndex + 10));

        } catch (err) {
            console.error("Failed to fetch customized orders", err);
            toastError("Failed to fetch customized orders");
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery]);

    useEffect(() => {
        fetchOrders();
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

    const prodStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'in_production': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'ready': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
            case 'shipped': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 min-h-screen bg-gray-50 -m-8 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                        <Wand2 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Customized Orders</h1>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Personalized items requiring production</p>
                    </div>
                </div>
                <div className="text-sm text-gray-500 font-bold bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
                    {pagination.total} Custom Orders
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search custom orders..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Production</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">Loading customized orders...</td></tr>
                            ) : orders.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">No customized orders found.</td></tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-orange-50/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{order.order_id || `#${order.id}`}</div>
                                            <div className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{order.customer?.name || "Guest"}</div>
                                            <div className="text-xs text-gray-500">{order.customer?.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${prodStatusColor(order.production_status)}`}>
                                                {order.production_status?.replace('_', ' ') || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${statusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">₹{order.shopTotal?.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link
                                                to={`/seller/orders/${order.url_token || order.id}`}
                                                className="text-orange-600 hover:text-orange-800 bg-orange-50 p-2 rounded-lg inline-block transition-colors"
                                            >
                                                <Eye size={18} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
                    <div className="text-sm text-gray-500">
                        Page {currentPage} of {pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                            disabled={currentPage === pagination.totalPages}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerCustomizedOrders;
