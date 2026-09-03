import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { encryptId } from "../../utils/secureId";
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Area, Legend
} from 'recharts';
import { Package, AlertTriangle, ArrowDown, ArrowUp, XCircle } from 'lucide-react'; // Added icons
import { toastError, toastSuccess } from '../../utils/toast';
import ConfirmationModal from '../../components/ConfirmationModal';
import GeoMap from '../../admin/components/GeoMap';

const Analytics = () => {
    const [activeTab, setActiveTab] = useState('traffic'); // 'traffic' | 'sales' | 'funnel' | 'location' | 'products'
    const [trafficStats, setTrafficStats] = useState(null);
    const [salesStats, setSalesStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [salesRange, setSalesRange] = useState('30days');

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    const [funnelData, setFunnelData] = useState(null);
    const [locationData, setLocationData] = useState(null);
    const [productData, setProductData] = useState(null); // Added State
    const [confirmModal, setConfirmModal] = useState(false);

    const handleFetchError = useCallback((error) => {
        console.error(error);
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('adminToken');
            window.location.href = '/admin'; // Redirect to login
        }
    }, []);

    const fetchProductData = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL || ""}/api/analytics/products?range=${salesRange}`, {
                withCredentials: true
            });
            setProductData(res.data);
        } catch (error) {
            handleFetchError(error);
        }
    }, [salesRange, handleFetchError]);

    const fetchTrafficStats = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL || ""}/api/analytics/stats`, {
                withCredentials: true
            });
            setTrafficStats(res.data);
            setLoading(false);
        } catch (error) {
            handleFetchError(error);
        }
    }, [handleFetchError]);

    const fetchLocationStats = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL || ""}/api/analytics/location?range=${salesRange}`, {
                withCredentials: true
            });
            setLocationData(res.data);
        } catch (error) {
            handleFetchError(error);
        }
    }, [salesRange, handleFetchError]);

    const fetchSalesStats = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL || ""}/api/analytics/sales?range=${salesRange}`, {
                withCredentials: true
            });
            setSalesStats(res.data);
            setLoading(false);
        } catch (error) {
            handleFetchError(error);
        }
    }, [salesRange, handleFetchError]);

    const fetchFunnelData = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL || ""}/api/analytics/funnel?range=${salesRange}`, {
                withCredentials: true
            });
            setFunnelData(res.data);
        } catch (error) {
            handleFetchError(error);
        }
    }, [salesRange, handleFetchError]);

    useEffect(() => {
        fetchTrafficStats();
        fetchSalesStats();
        fetchFunnelData();
        fetchLocationStats();
        fetchProductData();
    }, [salesRange, fetchTrafficStats, fetchSalesStats, fetchFunnelData, fetchLocationStats, fetchProductData]);

    const initiateClearCache = () => {
        setConfirmModal(true);
    };

    const confirmClearCache = async () => {
        try {
            await axios.post(`${process.env.REACT_APP_API_BASE_URL || ""}/api/analytics/cache/clear`, {}, {
                withCredentials: true
            });
            toastSuccess('Cache cleared successfully. Reloading data...');
            // Reload all data
            setLoading(true);
            fetchTrafficStats();
            fetchSalesStats();
            fetchFunnelData();
            fetchLocationStats();
            fetchProductData();
        } catch (error) {
            console.error(error);
            toastError('Failed to clear cache');
        } finally {
            setConfirmModal(false);
        }
    };


    if (loading) return <div className="p-8 text-center">Loading Analytics...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
                    <button
                        onClick={initiateClearCache}
                        className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                    >
                        Clear Cache
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-white rounded-lg shadow-sm p-1 border border-gray-200">
                    <button
                        onClick={() => setActiveTab('traffic')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'traffic' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Traffic
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'sales' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Sales
                    </button>
                    <button
                        onClick={() => setActiveTab('funnel')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'funnel' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Funnel
                    </button>
                    <button
                        onClick={() => setActiveTab('location')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'location' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Location
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'products' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Products
                    </button>
                </div>
            </div>

            {/* TRAFFIC TAB */}
            {activeTab === 'traffic' && trafficStats && (
                <div className="animate-fade-in-up">
                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm font-medium">Total Visitors</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">{trafficStats.total_visitors}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm font-medium">Total Page Views</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{trafficStats.total_views}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm font-medium">Conversion Rate</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">{trafficStats.conversion_rate}%</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm font-medium">Avg. Views/Visitor</p>
                            <p className="text-3xl font-bold text-orange-600 mt-2">
                                {trafficStats.total_visitors > 0 ? (trafficStats.total_views / trafficStats.total_visitors).toFixed(1) : 0}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Visitors Over Time Chart */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Visitors (Last 7 Days)</h2>
                            <div style={{ width: '100%', height: 320 }}>
                                <ResponsiveContainer minWidth={0}>
                                    <LineChart data={trafficStats.visitors_over_time}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} axisLine={false} tickLine={false} dy={10} fontSize={12} />
                                        <YAxis axisLine={false} tickLine={false} fontSize={12} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="visitors" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Pages */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Top Pages</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Page URL</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Views</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trafficStats.top_pages && trafficStats.top_pages.map((page, index) => (
                                            <tr key={index} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                                <td className="py-3 px-4 text-sm text-gray-700 truncate max-w-xs">{page.page_url}</td>
                                                <td className="py-3 px-4 text-sm text-gray-900 font-medium text-right">{page.views}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SALES TAB */}
            {activeTab === 'sales' && salesStats && (
                <div className="animate-fade-in-up">
                    <div className="flex justify-end mb-6">
                        <select
                            value={salesRange}
                            onChange={(e) => setSalesRange(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none shadow-sm"
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="year">Last Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    {/* Sales Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">₹{salesStats.total_revenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <p className="text-gray-500 text-sm font-medium">Total Orders</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{salesStats.total_orders}</p>
                        </div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 bg-gradient-to-br from-yellow-50 to-white">
                            <p className="text-yellow-600 text-sm font-medium">Offer Zone Revenue</p>
                            <p className="text-3xl font-bold text-yellow-700 mt-2">₹{salesStats.offer_zone_revenue.toLocaleString()}</p>
                            <p className="text-xs text-yellow-600 mt-1">From discounted products</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Revenue vs Orders Chart */}
                        <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue vs Orders</h2>
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer minWidth={0}>
                                    <ComposedChart data={salesStats.sales_over_time}>
                                        <CartesianGrid stroke="#f3f4f6" strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString()} axisLine={false} tickLine={false} dy={10} fontSize={12} />
                                        <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} fontSize={12} tickFormatter={(val) => `₹${val / 1000}k`} />
                                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value, name) => [name === 'revenue' ? `₹${value}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                                        />
                                        <Legend />
                                        <Area yAxisId="left" type="monotone" dataKey="revenue" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={2} name="Revenue" />
                                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Orders" />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Sales by Category (Bar Chart) */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Sales by Category</h2>
                            <div style={{ width: '100%', height: 320 }}>
                                <ResponsiveContainer minWidth={0}>
                                    <BarChart layout="vertical" data={salesStats.sales_by_category.slice(0, 8)}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} fontSize={12} />
                                        <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} name="Revenue" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Sales by Brand/Subcategory (Pie Chart) */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Sales by Brand/Subcategory</h2>
                            <div style={{ width: '100%', height: 320 }} className="relative">
                                <ResponsiveContainer minWidth={0}>
                                    <PieChart>
                                        <Pie
                                            data={salesStats.sales_by_brand.slice(0, 6)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {salesStats.sales_by_brand.slice(0, 6).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span className="text-gray-400 text-xs font-medium">Revenue<br />Share</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FUNNEL TAB */}
            {activeTab === 'funnel' && funnelData && (
                <div className="animate-fade-in-up">
                    <div className="flex justify-end mb-6">
                        <select
                            value={salesRange}
                            onChange={(e) => setSalesRange(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none shadow-sm"
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="year">Last Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Conversion Funnel</h2>
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer minWidth={0}>
                                <BarChart
                                    data={funnelData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="stage" />
                                    <YAxis />
                                    <Tooltip
                                        cursor={{ fill: '#f4f4f5' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                const prevStageIndex = funnelData.findIndex(item => item.stage === data.stage) - 1;
                                                const prevData = prevStageIndex >= 0 ? funnelData[prevStageIndex] : null;
                                                const conversion = prevData && prevData.count > 0 ? ((data.count / prevData.count) * 100).toFixed(1) : 100;

                                                return (
                                                    <div className="bg-white p-3 border border-gray-100 shadow-md rounded-md">
                                                        <p className="font-bold text-gray-800">{data.stage}</p>
                                                        <p className="text-blue-600 font-semibold">{data.count} Users</p>
                                                        {prevData && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Conversion: <span className="text-green-600 font-bold">{conversion}%</span> from {prevData.stage}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#666' }}>
                                        {funnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-8 grid grid-cols-5 gap-4 text-center">
                            {funnelData.map((stage, idx) => {
                                const prev = idx > 0 ? funnelData[idx - 1] : null;
                                const dropoff = prev ? 100 - ((stage.count / prev.count) * 100) : 0;
                                return (
                                    <div key={idx} className="flex flex-col items-center">
                                        <span className="text-sm font-bold text-gray-700">{stage.stage}</span>
                                        <span className="text-2xl font-bold mt-1" style={{ color: stage.fill }}>{stage.count}</span>
                                        {idx > 0 && (
                                            <span className="text-xs text-red-500 mt-1">
                                                ↓ {dropoff.toFixed(1)}% Drop
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* LOCATION TAB */}
            {activeTab === 'location' && (
                <div className="animate-fade-in-up">
                    <div className="flex justify-end mb-6">
                        <select
                            value={salesRange}
                            onChange={(e) => setSalesRange(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none shadow-sm"
                        >
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="year">Last Year</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>


                    {(() => {
                        // Helper to clean dirty JSON strings in State names if present
                        const cleanStateName = (name) => {
                            if (!name) return "Unknown";
                            // Check if it looks like the messy JSON string
                            if (typeof name === 'string' && (name.includes('{') || name.includes('}') || name.includes('"') || name.includes('FLAT_HOUSE'))) {
                                // Just sanitize nicely if possible or return a placeholder if it looks like garbage
                                if (name.includes('FLAT_HOUSE') || name.includes(':')) {
                                    return "Other / Invalid"; // Or filter out
                                }
                                return name.replace(/[^a-zA-Z\s]/g, ""); // Basic cleanup
                            }
                            return name;
                        };

                        // Process data for this render only
                        const cleanLocationData = locationData ? {
                            ...locationData,
                            top_states: locationData.top_states.map(s => ({ ...s, state: cleanStateName(s.state) })).filter(s => s.state !== "Other / Invalid"),
                            top_revenue: locationData.top_revenue.map(s => ({ ...s, state: cleanStateName(s.state) })).filter(s => s.state !== "Other / Invalid"),
                            cod_risk: locationData.cod_risk.map(s => ({ ...s, state: cleanStateName(s.state) })).filter(s => s.state !== "Other / Invalid")
                        } : null;

                        return cleanLocationData ? (

                            <div className="space-y-8">
                                {/* World/India Geo Map */}
                                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                    <h2 className="text-xl font-bold text-gray-800 mb-4">Live Order Heatmap</h2>
                                    <GeoMap data={locationData.top_revenue} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Orders by State */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                        <h2 className="text-xl font-bold text-gray-800 mb-4">Orders by State</h2>
                                        <div style={{ width: '100%', height: 350 }}>
                                            <ResponsiveContainer minWidth={0}>
                                                <BarChart
                                                    data={locationData.top_states}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="state" type="category" width={120} axisLine={false} tickLine={false} fontSize={11} />
                                                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} />
                                                    <Bar dataKey="orders" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Orders" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Revenue by State */}
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                        <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue by State</h2>
                                        <div style={{ width: '100%', height: 350 }}>
                                            <ResponsiveContainer minWidth={0}>
                                                <BarChart
                                                    data={locationData.top_revenue}
                                                    layout="vertical"
                                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="state" type="category" width={120} axisLine={false} tickLine={false} fontSize={11} />
                                                    <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px' }} formatter={(val) => `₹${val.toLocaleString()}`} />
                                                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} name="Revenue" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* COD Risk Analysis */}
                                    <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <span>⚠️</span> COD Failure Risk (High Cancellation/Return)
                                        </h2>
                                        {locationData.cod_risk && locationData.cod_risk.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left text-gray-500">
                                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3">State</th>
                                                            <th className="px-6 py-3 text-center">Total COD Orders</th>
                                                            <th className="px-6 py-3 text-center">Failures (Cancel/Return)</th>
                                                            <th className="px-6 py-3 text-right">Failure Rate</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {locationData.cod_risk.map((item, idx) => (
                                                            <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                                                <td className="px-6 py-4 font-medium text-gray-900">{item.state}</td>
                                                                <td className="px-6 py-4 text-center">{item.cod_orders}</td>
                                                                <td className="px-6 py-4 text-center text-red-500 font-bold">{item.cod_failures}</td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.failure_rate > 20 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                                        {item.failure_rate}%
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                                <p>No high-risk COD regions detected yet.</p>
                                                <p className="text-xs mt-1">(Regions appear here after 5+ COD orders)</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">Loading Location Data...</div>
                        )
                    })()}
                </div>
            )}

            {/* PRODUCT PERFORMANCE TAB (New) */}
            {
                activeTab === 'products' && productData && (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Product Performance</h2>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    Data: {salesRange === 'all' ? 'All Time' : `Last ${salesRange.replace('days', ' Days').replace('year', 'Year')}`}
                                </span>
                                <select
                                    value={salesRange}
                                    onChange={(e) => setSalesRange(e.target.value)}
                                    className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none shadow-sm"
                                >
                                    <option value="7days">Last 7 Days</option>
                                    <option value="30days">Last 30 Days</option>
                                    <option value="year">Last Year</option>
                                    <option value="all">All Time</option>
                                </select>
                            </div>
                        </div>

                        {/* High Level Stats / Summary Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-8">

                            {/* 1. Top Selling */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-green-50 border-b border-green-100 flex items-center justify-between">
                                    <h3 className="font-bold text-green-800 flex items-center gap-2">
                                        <Package size={18} /> Top Selling Products
                                    </h3>
                                    <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-1 rounded">Best Performers</span>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Product</th>
                                                <th className="px-4 py-3 text-right">Sold</th>
                                                <th className="px-4 py-3 text-right">Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {productData.top_selling.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-800 font-medium truncate max-w-[200px]">{p.name}</td>
                                                    <td className="px-4 py-3 text-right text-green-600 font-bold">{p.sales}</td>
                                                    <td className="px-4 py-3 text-right text-gray-600">₹{p.revenue.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {productData.top_selling.length === 0 && (
                                                <tr><td colSpan="3" className="p-4 text-center text-gray-400">No sales data found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Chart: Top Selling */}
                                <div className="p-4 border-t border-gray-100 h-64">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={productData.top_selling} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                                            <XAxis dataKey="name" tickFormatter={(val) => val.substring(0, 10) + '...'} fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f0fdf4' }} contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="sales" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={30} name="Sales" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 2. Worst Performing */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                        <ArrowDown size={18} className="text-gray-500" /> Low/No Sales
                                    </h3>
                                    <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded">Worst Performing</span>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Product</th>
                                                <th className="px-4 py-3 text-right">Stock</th>
                                                <th className="px-4 py-3 text-right">Sales ({salesRange === 'all' ? 'All' : salesRange.replace('days', 'd').replace('year', '1y')})</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {productData.worst_performing.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{p.name}</td>
                                                    <td className="px-4 py-3 text-right text-gray-500">{p.stock}</td>
                                                    <td className="px-4 py-3 text-right text-gray-400 font-medium">{p.sales}</td>
                                                </tr>
                                            ))}
                                            {productData.worst_performing.length === 0 && (
                                                <tr><td colSpan="3" className="p-4 text-center text-gray-400">All products have sales!</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Chart: Dead Stock Levels */}
                                <div className="p-4 border-t border-gray-100 h-64">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={productData.worst_performing} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f9fafb" />
                                            <XAxis dataKey="name" tickFormatter={(val) => val.substring(0, 10) + '...'} fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="stock" fill="#9ca3af" radius={[4, 4, 0, 0]} barSize={30} name="Stock Level" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 3. Dead Stock / Low Stock Alerts */}
                            <div className="bg-white rounded-lg shadow-sm border border-orange-100 overflow-hidden">
                                <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                                    <h3 className="font-bold text-orange-800 flex items-center gap-2">
                                        <AlertTriangle size={18} /> Low Stock Alerts (≤ 10)
                                    </h3>
                                    <span className="text-xs font-bold bg-orange-200 text-orange-800 px-2 py-1 rounded">Reorder Soon</span>
                                </div>
                                <div className="p-0">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 font-medium">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Product</th>
                                                <th className="px-4 py-3 text-right">Remaining</th>
                                                <th className="px-4 py-3 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {productData.low_stock.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-800 font-medium truncate max-w-[200px]">
                                                        <Link to={`/admin/products/edit/${encryptId(p.id)}`} className="text-blue-600 hover:underline">
                                                            {p.name}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-orange-600 font-bold text-lg">{p.stock}</td>
                                                    <td className="px-4 py-3 text-right"><span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Low</span></td>
                                                </tr>
                                            ))}
                                            {productData.low_stock.length === 0 && (
                                                <tr><td colSpan="3" className="p-4 text-center text-green-600">Stock levels are healthy.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Chart: Low Stock Levels */}
                                <div className="p-4 border-t border-orange-100 h-64">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={productData.low_stock} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fff7ed" />
                                            <XAxis dataKey="name" tickFormatter={(val) => val.substring(0, 10) + '...'} fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: '#fff7ed' }} contentStyle={{ borderRadius: '8px' }} />
                                            <Bar dataKey="stock" fill="#ea580c" radius={[4, 4, 0, 0]} barSize={30} name="Stock" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 4. Out of Stock & High Return */}
                            <div className="flex flex-col gap-6">

                                {/* Out of Stock - No Chart (0 quantities) */}
                                <div className="bg-white rounded-lg shadow-sm border border-red-100 overflow-hidden flex-1">
                                    <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                                        <h3 className="font-bold text-red-800 flex items-center gap-2">
                                            <XCircle size={18} /> Out of Stock
                                        </h3>
                                        <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-1 rounded">Critical</span>
                                    </div>
                                    <div className="p-4">
                                        {productData.out_of_stock.length > 0 ? (
                                            <ul className="space-y-2">
                                                {productData.out_of_stock.slice(0, 5).map((p, i) => (
                                                    <li key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                                        <Link to={`/admin/products/edit/${encryptId(p.id)}`} className="text-blue-600 hover:underline truncate font-medium">
                                                            {p.name}
                                                        </Link>
                                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded whitespace-nowrap">0 Qty</span>
                                                    </li>
                                                ))}
                                                {productData.out_of_stock.length > 5 && (
                                                    <li className="text-center text-xs text-red-500 pt-2 font-medium">
                                                        + {productData.out_of_stock.length - 5} more products
                                                    </li>
                                                )}
                                            </ul>
                                        ) : (
                                            <p className="text-center text-gray-400 text-sm">No products are out of stock.</p>
                                        )}
                                    </div>
                                </div>

                                {/* High Returns */}
                                <div className="bg-white rounded-lg shadow-sm border border-purple-100 overflow-hidden flex-1">
                                    <div className="p-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                                        <h3 className="font-bold text-purple-800 flex items-center gap-2">
                                            <ArrowUp size={18} /> High Returns
                                        </h3>
                                        <span className="text-xs font-bold bg-purple-200 text-purple-800 px-2 py-1 rounded">Attention</span>
                                    </div>
                                    <div className="p-4">
                                        {productData.high_return.length > 0 ? (
                                            <ul className="space-y-2">
                                                {productData.high_return.map((p, i) => (
                                                    <li key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                                        <Link to={`/admin/products/edit/${encryptId(p.id)}`} className="text-blue-600 hover:underline truncate font-medium">
                                                            {p.name}
                                                        </Link>
                                                        <div className="text-right">
                                                            <span className="text-xs font-bold text-purple-600 block">{p.returns} Returns</span>
                                                            <span className="text-[10px] text-gray-400 font-medium">{p.return_rate}% Rate</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-center text-gray-400 text-sm">No high return rate products.</p>
                                        )}
                                    </div>
                                    {/* Chart: Returns */}
                                    <div className="p-4 border-t border-purple-100 h-40">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                            <BarChart data={productData.high_return} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#faf5ff" />
                                                <XAxis dataKey="name" tickFormatter={(val) => val.substring(0, 10) + '...'} fontSize={10} axisLine={false} tickLine={false} />
                                                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                                <Tooltip cursor={{ fill: '#faf5ff' }} contentStyle={{ borderRadius: '8px' }} />
                                                <Bar dataKey="returns" fill="#9333ea" radius={[4, 4, 0, 0]} barSize={20} name="Returns" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )
            }



            <ConfirmationModal
                isOpen={confirmModal}
                onClose={() => setConfirmModal(false)}
                onConfirm={confirmClearCache}
                title="Clear Analytics Cache?"
                message="Are you sure you want to clear the analytics cache? This will force a refresh of all data."
                confirmText="Clear Cache"
                isDelete={true}
            />
        </div >
    );
};

export default Analytics;
