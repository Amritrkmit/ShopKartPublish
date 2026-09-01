import React, { useState, useEffect } from 'react';
import { Bell, Package, Tag, Info, Trash2, CheckCircle2, ChevronRight, Inbox } from 'lucide-react';
import AccountLayout from './AccountLayout';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    // Mock notifications for UI demonstration since backend might not have user_notifications table yet
    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                // Try to fetch from backend if endpoint exists, else fallback to mock
                const token = localStorage.getItem("userToken");
                const res = await axios.get(`${API_BASE_URL}/users/notifications`, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => null);

                if (res && res.data) {
                    setNotifications(res.data);
                } else {
                    // Premium Mock Data
                    setNotifications([
                        {
                            id: 1,
                            type: 'order',
                            title: 'Order Delivered!',
                            message: 'Your order #ORD12345 has been successfully delivered. We hope you love your purchase!',
                            time: '2 hours ago',
                            read: false,
                            icon: Package,
                            color: 'text-green-600',
                            bg: 'bg-green-50'
                        },
                        {
                            id: 2,
                            type: 'promo',
                            title: 'Exclusive Offer Just for You!',
                            message: 'Get extra 20% OFF on your next purchase with code: LUCKY20. Valid for 48 hours.',
                            time: '5 hours ago',
                            read: false,
                            icon: Tag,
                            color: 'text-orange-600',
                            bg: 'bg-orange-50'
                        },
                        {
                            id: 3,
                            type: 'info',
                            title: 'Account Security Update',
                            message: 'We noticed a login from a new device. If this wasn\'t you, please secure your account immediately.',
                            time: '1 day ago',
                            read: true,
                            icon: Info,
                            color: 'text-blue-600',
                            bg: 'bg-blue-50'
                        },
                        {
                            id: 4,
                            type: 'order',
                            title: 'Refund Processed',
                            message: 'A refund of ₹1,299 for your returned item has been processed to your original payment method.',
                            time: '2 days ago',
                            read: true,
                            icon: Package,
                            color: 'text-green-600',
                            bg: 'bg-green-50'
                        }
                    ]);
                }
            } catch (err) {
                console.error("Failed to fetch notifications", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, []);

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter(n => n.type === activeTab);

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <AccountLayout>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black">
                                    {unreadCount} NEW
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider font-bold text-[10px]">
                            Stay updated with your orders and offers
                        </p>
                    </div>
                    {notifications.length > 0 && (
                        <button
                            onClick={markAllRead}
                            className="text-brand-orange hover:text-orange-700 font-bold text-sm transition-colors flex items-center gap-1.5"
                        >
                            <CheckCircle2 size={16} />
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b overflow-x-auto hide-scrollbar">
                    {['all', 'order', 'promo', 'info'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-4 text-sm font-bold capitalize whitespace-nowrap transition-all border-b-2 ${activeTab === tab
                                    ? 'border-brand-orange text-brand-orange bg-orange-50/30'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab === 'all' ? 'All Notifications' : tab + 's'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-3">
                            <div className="w-10 h-10 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Fetching your alerts...</p>
                        </div>
                    ) : filteredNotifications.length > 0 ? (
                        <div className="divide-y">
                            {filteredNotifications.map((notif) => {
                                const Icon = notif.icon || Bell;
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => markAsRead(notif.id)}
                                        className={`p-6 flex gap-4 transition-all cursor-pointer group hover:bg-gray-50/80 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center ${notif.bg || 'bg-gray-100'}`}>
                                            <Icon className={`w-6 h-6 ${notif.color || 'text-gray-600'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1 gap-2">
                                                <h3 className={`font-bold text-[15px] truncate ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                                                    {notif.title}
                                                </h3>
                                                <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-tighter">
                                                    {notif.time}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                                                {notif.message}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notif.id);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                            <ChevronRight size={18} className="text-gray-300" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Inbox size={48} className="text-gray-200" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">No Notifications Yet</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                When you receive notifications about your orders or account, they will appear here.
                            </p>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="mt-8 px-8 py-3 bg-brand-orange text-white text-sm font-bold rounded-sm shadow-md hover:bg-brand-orange-hover transition-colors"
                            >
                                START SHOPPING
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Insight */}
                {notifications.length > 0 && (
                    <div className="p-4 bg-gray-50 text-center border-t">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                            Notifications are automatically cleared after 30 days
                        </p>
                    </div>
                )}
            </div>
        </AccountLayout>
    );
};

export default Notifications;
