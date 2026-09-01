import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { ShoppingBag, Package, TrendingUp, DollarSign, ChevronRight, Plus, Info } from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + "/api";

const DashboardCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                {subtext && <p className="text-[10px] text-green-600 mt-2 font-bold uppercase tracking-wider">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
    </div>
);

const SellerDashboard = () => {
    const { seller } = useOutletContext();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [recentProducts, setRecentProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDashboardStats = useCallback(async () => {
        try {
            const token = localStorage.getItem("sellerToken");
            if (!token || !seller) {
                console.warn("❌ SellerDashboard: Missing token or seller context", { token: !!token, seller: !!seller });
                setLoading(false);
                return;
            }

            const [statsRes, ordersRes, productsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/seller/stats`, {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                }),
                axios.get(`${API_BASE_URL}/orders/seller?limit=5`, {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                }),
                axios.get(`${API_BASE_URL}/products?shop_id=${seller.shop_id}&limit=5&include_drafts=true`, {
                    headers: { Authorization: `Bearer ${token}` },
                    withCredentials: true
                })
            ]);

            setStats(statsRes.data);
            setRecentOrders(ordersRes.data.orders || []);
            setRecentProducts(productsRes.data.products || []);
        } catch (err) {
            console.error("Failed to fetch dashboard stats", err);
        } finally {
            setLoading(false);
        }
    }, [seller]);

    useEffect(() => {
        fetchDashboardStats();
    }, [fetchDashboardStats]);

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading store insights...</div>;

    return (
        <div className="min-h-screen bg-gray-50 -m-8 pb-20">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Main Menu</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Dashboard Overview</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate("/seller/products/add/")}
                                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Plus size={18} />
                                Add Product
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Verification Alert */}
                {seller?.status && seller.status !== 'APPROVED' && (
                    <div className={`p-4 rounded-lg flex items-start gap-4 border shadow-sm ${seller.status === 'PENDING_VERIFICATION' ? 'bg-blue-50 border-blue-100' :
                        seller.status === 'REJECTED' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                        }`}>
                        <Info size={20} className={`mt-0.5 shrink-0 ${seller.status === 'PENDING_VERIFICATION' ? 'text-blue-600' :
                            seller.status === 'REJECTED' ? 'text-red-600' : 'text-amber-600'
                            }`} />
                        <div>
                            <h4 className={`text-sm font-bold ${seller.status === 'PENDING_VERIFICATION' ? 'text-blue-900' :
                                seller.status === 'REJECTED' ? 'text-red-900' : 'text-amber-900'
                                }`}>Verification Status: {seller.status.replace(/_/g, ' ')}</h4>
                            <p className="text-xs font-medium opacity-80 mt-1 leading-relaxed">
                                {seller.admin_remarks || "Your application is currently being reviewed. You can manage products, but they will only be live once verified."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
                    <DashboardCard
                        title="Active Products"
                        value={stats?.activeProducts?.toLocaleString('en-IN') || 0}
                        icon={Package}
                        color="bg-blue-500"
                        subtext="Live in store"
                    />
                    <DashboardCard
                        title="New Orders"
                        value={stats?.ordersSummary?.today || 0}
                        icon={ShoppingBag}
                        color="bg-orange-500"
                        subtext="Incoming today"
                    />
                    <DashboardCard
                        title="Total Revenue"
                        value={`₹${stats?.earnings?.total?.toLocaleString('en-IN') || 0}`}
                        icon={DollarSign}
                        color="bg-green-500"
                        subtext="Lifetime earnings"
                    />
                    <DashboardCard
                        title="Cancellations"
                        value={stats?.cancelledOrders || 0}
                        icon={TrendingUp}
                        color="bg-red-500"
                        subtext="Cancelled orders"
                    />
                    <DashboardCard
                        title="Personalized"
                        value={stats?.customizedOrders || 0}
                        icon={Info}
                        color="bg-purple-500"
                        subtext="Custom orders"
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Products */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h4 className="text-sm font-semibold text-gray-900">Recently Added Products</h4>
                                <Link to="/seller/products/" className="text-xs font-bold text-blue-600 hover:underline">Manage All</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-semibold uppercase tracking-widest border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left">Product</th>
                                            <th className="px-6 py-3 text-left">Status</th>
                                            <th className="px-6 py-3 text-right">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {recentProducts.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={p.image ? `${API_BASE_URL.replace('/api', '')}${p.image}` : 'https://placehold.co/40'} className="w-10 h-10 rounded-lg object-cover border border-gray-100" alt="" />
                                                        <span className="font-bold text-gray-700 truncate max-w-[250px]">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {p.is_active ? 'Live' : 'Draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-gray-900">₹{p.price?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Latest Orders */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-fit">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h4 className="text-sm font-semibold text-gray-900">Latest Orders</h4>
                            <Link to="/seller/orders/" className="text-xs font-bold text-blue-600 hover:underline">View All</Link>
                        </div>
                        <div className="p-4 space-y-3">
                            {recentOrders.map(o => (
                                <div key={o.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-blue-100 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center font-bold text-[10px] text-gray-400 border border-gray-100 group-hover:bg-blue-50 transition-colors">
                                            #{o.id}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{o.customer?.name || "Customer"}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">{new Date(o.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-gray-900">₹{o.shopTotal?.toLocaleString()}</p>
                                        <span className={`text-[9px] font-bold uppercase ${o.status === 'DELIVERED' ? 'text-green-600' :
                                            o.status === 'PROCESSING' ? 'text-blue-600' : 'text-gray-400'
                                            }`}>{o.status}</span>
                                    </div>
                                </div>
                            ))}
                            {recentOrders.length === 0 && <div className="py-12 text-center text-gray-400 italic text-xs">No recent orders</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerDashboard;
