import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, AlertTriangle, CheckCircle, Database, CreditCard, ShoppingCart } from 'lucide-react';

const SystemHealth = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/system-health/dashboard`, {
                    withCredentials: true
                });
                setStats(res.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching system health:", error);
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading System Health...</div>;

    if (!stats) return <div className="p-8 text-center text-red-500">Failed to load system health data.</div>;

    const healthItems = [
        {
            title: "Failed Payments",
            count: stats.failed_payments,
            icon: <CreditCard className="w-8 h-8 text-red-500" />,
            desc: "Failed or cancelled orders in last 30 days",
            color: stats.failed_payments > 5 ? "bg-red-50" : "bg-white"
        },
        {
            title: "Abandoned Carts",
            count: stats.abandoned_carts,
            icon: <ShoppingCart className="w-8 h-8 text-orange-500" />,
            desc: "Users who added to cart but didn't buy (24h)",
            color: stats.abandoned_carts > 20 ? "bg-orange-50" : "bg-white"
        },
        {
            title: "API Errors",
            count: stats.api_errors,
            icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
            desc: "Critical server errors in last 24h",
            color: stats.api_errors > 0 ? "bg-yellow-50 border-yellow-200" : "bg-white"
        },
        {
            title: "Order Sync Issues",
            count: stats.order_sync_issues,
            icon: <Database className="w-8 h-8 text-purple-500" />,
            desc: "Orders stuck in 'pending' > 24h",
            color: stats.order_sync_issues > 0 ? "bg-purple-50" : "bg-white"
        },
        {
            title: "Payment Success Rate",
            count: `${stats.payment_success_rate}%`,
            icon: <CheckCircle className="w-8 h-8 text-green-500" />,
            desc: "Successful vs Total Orders (30d)",
            color: "bg-white"
        }
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-screen animate-fade-in-up">
            <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                <Activity className="text-blue-600" />
                Admin & System Health
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {healthItems.map((item, idx) => (
                    <div key={idx} className={`p-6 rounded-lg shadow-sm border border-gray-100 ${item.color} transition-all hover:shadow-md`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-700">{item.title}</h3>
                                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                            </div>
                            <div className="p-2 bg-gray-100 rounded-full">
                                {item.icon}
                            </div>
                        </div>
                        <div className="text-3xl font-black text-gray-900">
                            {item.count}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recommendations / Actions */}
            <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-800 mb-4">System Status Overview</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${stats.api_errors === 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-gray-700">
                            Backend API Status: <strong>{stats.api_errors === 0 ? 'Healthy' : 'Issues Detected'}</strong>
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${stats.order_sync_issues === 0 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        <span className="text-gray-700">
                            Order Processing: <strong>{stats.order_sync_issues === 0 ? 'Optimal' : `${stats.order_sync_issues} orders pending review`}</strong>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemHealth;
