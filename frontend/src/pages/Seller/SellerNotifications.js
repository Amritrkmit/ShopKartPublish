import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Bell, CheckCircle, Clock, Trash2, ArrowRight, ChevronRight, Check } from "lucide-react";
import { toastError, toastSuccess } from "../../utils/toast";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        try {
            const token = localStorage.getItem("sellerToken");
            const res = await axios.get(`${API_BASE_URL}/seller/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.notifications || []);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
            toastError("Failed to load notifications");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem("sellerToken");
            await axios.patch(`${API_BASE_URL}/seller/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        } catch (err) {
            console.error("Failed to mark read", err);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem("sellerToken");
            await axios.patch(`${API_BASE_URL}/seller/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            toastSuccess("All marked as read");
        } catch (err) {
            toastError("Action failed");
        }
    };

    const deleteNotification = async (id) => {
        try {
            const token = localStorage.getItem("sellerToken");
            await axios.delete(`${API_BASE_URL}/seller/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(n => n.id !== id));
            toastSuccess("Cleared");
        } catch (err) {
            toastError("Failed to delete");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Checking alerts...</div>;

    return (
        <div className="min-h-screen bg-gray-50 -m-8 pb-20">
            {/* Top Action Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Platform</span>
                            <ChevronRight size={16} />
                            <span className="text-gray-900 font-semibold">Notifications</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={markAllRead}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <Check size={16} /> Mark all read
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">
                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <div className="bg-white p-20 text-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 flex flex-col items-center justify-center">
                            <Bell size={48} className="mb-4 opacity-20" />
                            <p className="font-bold text-lg">You're all caught up!</p>
                            <p className="text-sm">No new notifications for your store at the moment.</p>
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => !n.is_read && markAsRead(n.id)}
                                className={`bg-white p-5 rounded-lg border transition-all cursor-pointer group flex gap-5 items-start ${n.is_read ? 'border-gray-200 opacity-75' : 'border-blue-100 shadow-sm ring-1 ring-blue-50'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${n.is_read ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-600 font-bold'
                                    }`}>
                                    {n.type === 'order' ? <CheckCircle size={20} /> : <Bell size={20} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className={`text-sm font-bold truncate ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</h4>
                                        {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>}
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">{n.message}</p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            <Clock size={12} /> {new Date(n.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SellerNotifications;
