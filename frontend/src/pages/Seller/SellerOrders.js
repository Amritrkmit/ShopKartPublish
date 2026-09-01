import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toastError } from "../../utils/toast";
import { encryptId } from "../../utils/secureId";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    // Pagination defaults since seller API might strictly return list, 
    // but looking at 'AllOrders' structure on backend, it supports pagination via query limits.
    // The current '/orders/seller' endpoint in backend supports 'limit' but maybe not full pagination metadata object in response?
    // Let's check the response structure of '/orders/seller' again. 
    // It returns { success: true, orders: [...] }. It DOES NOT return total/totalPages yet.
    // We might need to fake pagination or just show list. 
    // For now, let's keep it simple or assume we scroll/load more. 
    // Actually, let's stick to the list view and maybe client-side paginate if needed, 
    // OR just display all recent orders as the backend returns recent ones with a limit.
    // To match Admin completely, we ideally need server-side pagination.
    // The backend endpoint '/orders/seller' has `LIMIT` query support but doesn't return count.
    // I will implement client-side pagination for now if the list is long, or just standard display.
    // For the UI to "look" like admin, we'll keep the structure.

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
                    status: statusFilter || undefined,
                    has_customized_items: 'false'
                },
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true
            });

            // Backend returns { success: true, orders: [...] }
            // Let's manually handle pagination for the MVP of this "lookalike" feature
            const allOrders = res.data.orders || [];

            // Filter locally by search if needed (since backend might not support search)
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

            // Slice for current page
            const startIndex = (currentPage - 1) * 10;
            setOrders(filtered.slice(startIndex, startIndex + 10));

        } catch (err) {
            console.error("Failed to fetch orders", err);
            toastError("Failed to fetch orders");
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchQuery, statusFilter]);

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

    if (loading && orders.length === 0) return <div className="p-8 text-center text-gray-500">Loading orders...</div>;

    return (
        <div className="space-y-6 min-h-screen bg-gray-50 -m-8 p-8">
            {/* Header matches Admin */}
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
                        className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap flex-1
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
                        placeholder="Search by Order ID, Customer Name, or Email..."
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <div className="flex flex-col">
                                            <span>{order.order_id || `#${order.id}`}</span>
                                            <span className="text-[10px] text-gray-400">#{order.id}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{order.customer?.name || "Guest"}</div>
                                        <div className="text-xs text-gray-500">{order.customer?.email}</div>
                                    </td>
                                    {/* Show Shop Total instead of Grand Total for Seller visibility */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">₹{order.shopTotal?.toLocaleString()}</td>
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
                                            to={`/seller/orders/${encryptId(order.id)}`}
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
            {orders.length === 0 && <div className="p-8 text-center text-gray-500">No orders found.</div>}

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

export default SellerOrders;
