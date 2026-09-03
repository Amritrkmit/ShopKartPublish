import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Crown, ArrowUpRight, ArrowDownLeft, Clock, Info, Tag, Users } from 'lucide-react';
import AccountLayout from '../Account/AccountLayout';
import { parsePrice, formatPrice } from '../../utils/format';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const SuperCoins = () => {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all, supercoins, groupbuy
    const [visibleCount, setVisibleCount] = useState(10);

    // Reset pagination when tab changes
    useEffect(() => {
        setVisibleCount(10);
    }, [activeTab]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Updated to use cookie-based auth
                const [coinRes, orderRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/users/me/supercoins`, {
                        withCredentials: true
                    }),
                    axios.get(`${API_BASE_URL}/orders`, {
                        withCredentials: true
                    })
                ]);

                setBalance(coinRes.data.balance);
                setTransactions(coinRes.data.transactions);
                setOrders(orderRes.data.orders);
            } catch (err) {
                console.error("Failed to fetch supercoins or orders", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Process and merge history
    const unifiedHistory = useMemo(() => {
        const coinEvents = transactions.map(t => ({
            id: `coin_${t.id}`,
            date: t.created_at,
            title: t.description,
            amount: t.amount,
            type: t.amount > 0 ? 'EARNED' : 'REDEEMED',
            category: 'supercoin',
            expiry: t.expiry_date,
            orderId: t.order_id
        }));

        const gbEvents = [];
        orders.forEach(order => {
            order.items.forEach((item, idx) => {
                if (item.gb_discount_percentage > 0) {
                    const sellingPrice = parsePrice(item.sale_price || item.price);
                    const percentage = parseFloat(item.gb_discount_percentage || 0);
                    const savings = Math.round((sellingPrice * percentage / 100) * (item.quantity || 1));
                    gbEvents.push({
                        id: `gb_${order.orderId}_${idx}`,
                        date: order.created_at,
                        title: `Group Buy Reward: ${item.name}`,
                        amount: savings,
                        type: 'SAVED',
                        category: 'groupbuy',
                        orderId: order.orderId
                    });
                }
            });
        });

        const combined = [...coinEvents, ...gbEvents];
        combined.sort((a, b) => new Date(b.date) - new Date(a.date));
        return combined;
    }, [transactions, orders]);

    const filteredHistory = useMemo(() => {
        if (activeTab === 'all') return unifiedHistory;
        return unifiedHistory.filter(h => h.category === activeTab);
    }, [unifiedHistory, activeTab]);

    const stats = useMemo(() => {
        const totalSaved = unifiedHistory
            .filter(h => h.type === 'SAVED')
            .reduce((acc, h) => acc + h.amount, 0);
        const totalEarned = transactions
            .filter(t => t.amount > 0)
            .reduce((acc, t) => acc + t.amount, 0);
        return { totalSaved, totalEarned };
    }, [unifiedHistory, transactions]);

    return (
        <AccountLayout>
            <div className="max-w-4xl">
                {/* Header Card */}
                <div className="bg-gradient-to-br from-orange-400 to-red-600 rounded-3xl p-8 text-white shadow-2xl mb-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                <Crown className="w-8 h-8 fill-current" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.2em] opacity-80">SuperCoin Zone</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                            <div>
                                <h1 className="text-5xl font-black mb-1 flex items-baseline gap-2">
                                    {balance}
                                    <span className="text-lg opacity-80">Coins</span>
                                </h1>
                                <p className="text-orange-100 font-medium">Available Balance</p>
                            </div>
                            <div className="flex gap-4 border-l border-white/20 pl-8">
                                <div>
                                    <p className="text-3xl font-bold">{formatPrice(stats.totalSaved)}</p>
                                    <p className="text-xs font-black uppercase tracking-wider opacity-70">Total Savings</p>
                                </div>
                                <div className="border-l border-white/20 pl-4">
                                    <p className="text-3xl font-bold">{stats.totalEarned}</p>
                                    <p className="text-xs font-black uppercase tracking-wider opacity-70">Total Earned</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative element */}
                    <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                    <Crown className="absolute -right-4 -top-4 w-48 h-48 opacity-10 rotate-12" />
                </div>

                {/* Info Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                        <Info className="text-blue-500 shrink-0" size={20} />
                        <p className="text-xs text-blue-800 leading-relaxed">
                            SuperCoins earned via scratch cards are valid for <b>1 year</b>. Use them during checkout for exclusive discounts!
                        </p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex gap-3">
                        <Tag className="text-green-500 shrink-0" size={20} />
                        <p className="text-xs text-green-800 leading-relaxed">
                            Group Buy Savings are applied <b>instantly</b> when a community goal is met. Your saved amount is tracked below.
                        </p>
                    </div>
                </div>

                {/* History Section */}
                <div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            Reward History
                            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{filteredHistory.length} Transactions</span>
                        </h2>

                        {/* Tabs */}
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            {[
                                { id: 'all', label: 'All Benefits' },
                                { id: 'supercoin', label: 'Coins' },
                                { id: 'groupbuy', label: 'Savings' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-2xl"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                            {filteredHistory.length === 0 ? (
                                <div className="p-16 text-center">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Clock className="text-gray-300" size={32} />
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-1">No benefits found</h3>
                                    <p className="text-gray-500 text-sm max-w-xs mx-auto">Start participating in group deals or shop more to earn and track your rewards here!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {filteredHistory.slice(0, visibleCount).map((h) => (
                                        <div key={h.id} className="p-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors !border-b !border-gray-100">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl ${h.type === 'EARNED' ? 'bg-green-50' : h.type === 'REDEEMED' ? 'bg-red-50' : 'bg-orange-50'
                                                    }`}>
                                                    {h.type === 'EARNED' ? (
                                                        <ArrowUpRight className="text-green-600" size={20} />
                                                    ) : h.type === 'REDEEMED' ? (
                                                        <ArrowDownLeft className="text-red-600" size={20} />
                                                    ) : (
                                                        <Users className="text-orange-600" size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-bold text-gray-900 leading-tight">{h.title}</p>
                                                        {h.category === 'groupbuy' && (
                                                            <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black uppercase">Group Goal</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium">
                                                        <span>{new Date(h.date).toLocaleDateString()}</span>
                                                        {h.expiry && (
                                                            <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                                                Exp: {new Date(h.expiry).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {h.orderId && (
                                                            <span className="text-gray-400">Order #{h.orderId}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`text-lg font-black ${h.type === 'EARNED' ? 'text-green-600' : h.type === 'SAVED' ? 'text-orange-600' : 'text-red-600'
                                                }`}>
                                                {h.type === 'EARNED' ? '+' : h.type === 'SAVED' ? 'Saved ' : ''}
                                                {h.type === 'SAVED' ? formatPrice(Math.abs(h.amount)) : Math.abs(h.amount)}
                                                {h.category === 'supercoin' && <span className="text-xs ml-1 uppercase opacity-60">Coins</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination "Load More" Button */}
                            {filteredHistory.length > visibleCount && (
                                <div className="p-4 flex justify-center border-t border-gray-100">
                                    <button
                                        onClick={() => setVisibleCount(prev => prev + 10)}
                                        className="text-brand-orange font-bold text-sm hover:underline uppercase tracking-wide"
                                    >
                                        Load More Activities
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AccountLayout>
    );
};

export default SuperCoins;
