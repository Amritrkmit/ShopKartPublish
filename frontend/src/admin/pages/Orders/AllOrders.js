import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../../utils/format";
import { generateProductUrl } from "../../../utils/productUrl";
import { encryptId } from "../../../utils/secureId";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const AllOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
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
                    status: statusFilter,
                    has_customized_items: 'false'
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
    }, [currentPage, searchQuery, statusFilter]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 500);

        return () => clearTimeout(timer);
    }, [fetchOrders]); // fetchOrders changes when searchQuery changes

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
                <div className="text-sm text-gray-500 font-medium">
                    Total: {pagination.total} orders
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 overflow-x-auto no-scrollbar">
                {["", "pending", "processing", "shipped", "delivered", "cancelled"].map((status) => (
                    <button
                        key={status}
                        onClick={() => {
                            setStatusFilter(status);
                            setCurrentPage(1);
                        }}
                        className={`px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold rounded-lg transition-all whitespace-nowrap flex-1
                            ${statusFilter === status
                                ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                    >
                        {status === "" ? "All Orders" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Order ID (ORD-...), Customer Name, or Email..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700"
                    />
                </div>
                <div className="w-full md:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-700 font-medium"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_id || "#" + order.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">
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

                                                if (Array.isArray(items)) {
                                                    return (
                                                        <div className="flex flex-col gap-1">
                                                            {items.map((i, idx) => (
                                                                <Link
                                                                    key={idx}
                                                                    to={generateProductUrl(i)}
                                                                    className="text-blue-600 hover:underline hover:text-blue-800 transition-colors truncate block text-xs"
                                                                    title={i.name}
                                                                >
                                                                    {i.name || "Unknown Product"}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return "Invalid format";
                                            } catch (e) {
                                                return "Error";
                                            }
                                        })()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Link to={`/admin/users?search=${order.user_email || order.user_id}`} className="block hover:bg-gray-50 transition-colors group">
                                            <div className="text-sm font-medium text-blue-600 group-hover:underline">{order.user_name || "Guest"}</div>
                                            <div className="text-xs text-gray-500">{order.user_email}</div>
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{formatPrice(order.total_amount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs font-medium rounded-full border ${statusColor(order.status)}`}>
                                            {order.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <Link
                                            to={`/admin/orders/${encryptId(order.id)}/`}
                                            className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg inline-block transition-colors"
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

            {loading && <div className="p-8 text-center text-gray-500">Loading orders...</div>}
            {!loading && orders.length === 0 && <div className="p-8 text-center text-gray-500">No orders found.</div>}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
                    <div className="text-sm text-gray-500">
                        Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} orders
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex gap-1">
                            {[...Array(pagination.totalPages)].map((_, idx) => {
                                const pageNum = idx + 1;
                                if (
                                    pageNum === 1 ||
                                    pageNum === pagination.totalPages ||
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`px-3 py-1 rounded-lg transition-colors ${currentPage === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'border border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                } else if (
                                    pageNum === currentPage - 2 ||
                                    pageNum === currentPage + 2
                                ) {
                                    return <span key={pageNum} className="px-2">...</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                            disabled={currentPage === pagination.totalPages}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllOrders;
