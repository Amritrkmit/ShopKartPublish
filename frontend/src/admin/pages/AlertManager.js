import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Bell, Mail, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { toastSuccess, toastError } from '../../utils/toast';

const AlertManager = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ active: 0, triggered: 0, price: 0, stock: 0 });

    const calculateStats = useCallback((data) => {
        const newStats = {
            active: data.filter(a => a.status === 'active').length,
            triggered: data.filter(a => a.status === 'triggered').length,
            price: data.filter(a => a.alert_type === 'price_drop').length,
            stock: data.filter(a => a.alert_type === 'restock').length,
        };
        setStats(newStats);
    }, []);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/alerts/admin/all`, {
                withCredentials: true
            });
            setAlerts(res.data);
            calculateStats(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            toastError("Failed to fetch alerts");
        }
    }, [calculateStats]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    const handleCheckTriggers = async () => {
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/alerts/admin/check-trigger`, {}, {
                withCredentials: true
            });
            toastSuccess(`Check complete. ${res.data.triggered} alerts triggered.`);
            fetchAlerts(); // Reload to see status changes
        } catch (error) {
            console.error(error);
            toastError("Failed to check triggers");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Alerts...</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen animate-fade-in-up">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <Bell className="text-blue-600" /> Price & Stock Alerts
                </h1>
                <button
                    onClick={handleCheckTriggers}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition-colors"
                >
                    <RefreshCw size={18} /> Run Check
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Active Alerts</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.active}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Triggered (Sent)</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.triggered}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Stock Requests</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{stats.stock}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Price Drop Watches</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">{stats.price}</p>
                </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                    All Subscriptions
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">User Email</th>
                                <th className="px-6 py-3">Product</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Target Price</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alerts.map((alert) => (
                                <tr key={alert.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                        <Mail size={16} className="text-gray-400" /> {alert.user_email}
                                    </td>
                                    <td className="px-6 py-4 truncate max-w-[200px]">{alert.product_name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${alert.alert_type === 'restock' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                                            }`}>
                                            {alert.alert_type === 'restock' ? 'Restock' : 'Price Drop'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {alert.target_price ? `₹${alert.target_price}` : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {alert.status === 'active' ? (
                                            <span className="flex items-center gap-1 text-blue-600 font-bold"><Clock size={14} /> Active</span>
                                        ) : alert.status === 'triggered' ? (
                                            <span className="flex items-center gap-1 text-green-600 font-bold"><CheckCircle size={14} /> Sent</span>
                                        ) : (
                                            <span className="text-gray-400">Cancelled</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">
                                        {new Date(alert.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {alerts.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-gray-400">No active alerts found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AlertManager;
