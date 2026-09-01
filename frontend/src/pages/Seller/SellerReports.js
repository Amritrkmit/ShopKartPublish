import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    BarChart3, LineChart as LineIcon, Download, ChevronRight,
    TrendingUp, Calendar, Package, ArrowUpRight
} from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerReports = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem("sellerToken");
            const res = await axios.get(`${API_BASE_URL}/seller/reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } catch (err) {
            console.error("Error fetching reports:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Analyzing shop performance...</div>;

    const { dailySales = [], categoryPerformance = [], topProducts = [] } = data || {};

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    // Mock traffic sources for visual completeness
    const trafficSources = [
        { name: 'Direct', value: 45 },
        { name: 'Search', value: 30 },
        { name: 'Social', value: 15 },
        { name: 'Referral', value: 10 },
    ];

    return (
        <div className="min-h-screen bg-gray-50 -m-8 pb-20">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Analytics</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Performance Reports</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                                <Calendar size={16} /> Last 30 Days
                            </button>
                            <button className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                                <Download size={16} /> Export Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header Feature */}
                <div className="bg-gray-900 rounded-lg p-10 mb-8 relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl">
                        <div className="flex items-center gap-2 text-blue-400 mb-4">
                            <TrendingUp size={20} />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Market Intelligence</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Store Insights & Analytics</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Monitor your sales growth, track category-level performance, and optimize your
                            product inventory with real-time data insights.
                        </p>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent"></div>
                    <BarChart3 className="absolute right-10 bottom-[-20px] text-white/5 w-64 h-64" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Sales Growth Chart */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-800">Sales Growth (30D)</h3>
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <LineIcon size={20} />
                                </div>
                            </div>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailySales}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                            fontSize={10}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            fontSize={10}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(val) => `₹${val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(val) => [`₹${val.toLocaleString()}`, 'Revenue']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#2563eb"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Products Table */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-900">Top Performing Products</h4>
                                <Package size={16} className="text-gray-400" />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50/50 text-gray-500 text-[10px] font-bold uppercase tracking-widest border-b border-gray-100">
                                            <th className="px-6 py-4 text-left">Product Name</th>
                                            <th className="px-6 py-4 text-center">Units Sold</th>
                                            <th className="px-6 py-4 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {topProducts.map((p, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">{p.name}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-bold text-xs">
                                                        {p.count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900">₹{p.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {topProducts.length === 0 && (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center text-gray-400 italic">No sales data available yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Traffic Sources (Mock-Dynamic) */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 pb-2 border-b">Traffic Distribution</h4>
                            <div className="h-56 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={trafficSources}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={8}
                                            dataKey="value"
                                        >
                                            {trafficSources.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-bold text-gray-900">1.2k</span>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Visitors</span>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {trafficSources.map((src, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-[10px] font-bold text-gray-600 uppercase">{src.name}: {src.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 pb-2 border-b">Category Performance</h4>
                            <div className="space-y-6">
                                {categoryPerformance.map((cat, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                                            <span className="text-gray-600">{cat.name}</span>
                                            <span className="text-gray-900">₹{cat.total.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{
                                                    width: `${Math.min(100, (cat.total / (categoryPerformance.reduce((acc, c) => acc + c.total, 0) || 1)) * 100)}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {categoryPerformance.length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-4">No category data yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Optimization Card */}
                        <div className="bg-blue-600 text-white rounded-lg p-6 shadow-xl shadow-blue-100 relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4 opacity-80">
                                    <TrendingUp size={16} />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Growth Tip</span>
                                </div>
                                <p className="text-sm font-medium leading-relaxed mb-6">
                                    Your "Fashion" category is growing fast. Consider adding 5-10 more SKUs to capture the search momentum.
                                </p>
                                <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                                    View Details <ArrowUpRight size={14} />
                                </button>
                            </div>
                            <div className="absolute -right-4 -bottom-4 bg-white/10 w-24 h-24 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerReports;

