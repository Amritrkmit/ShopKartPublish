import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Clock, CheckCircle, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import AccountLayout from './AccountLayout';


const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const MyGroupDeals = () => {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDeals = async () => {
            try {
                const token = localStorage.getItem("userToken");
                const res = await axios.get(`${API_BASE_URL}/group-buys/my-deals`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDeals(res.data);
            } catch (err) {
                console.error("Failed to fetch my deals", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDeals();
    }, []);

    const getStatusStyles = (status, endTime) => {
        const isExpired = new Date(endTime) < new Date();
        if (status === 'completed') return 'bg-green-100 text-green-700 border-green-200';
        if (isExpired) return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    return (
        <AccountLayout>
            <div className="max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Users className="text-brand-orange" size={28} />
                        My Group Buy Rewards
                    </h1>
                    <p className="text-gray-500">Track the status of group deals you've joined and claim your community rewards.</p>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-2xl"></div>
                        ))}
                    </div>
                ) : deals.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingBag className="text-brand-orange" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No active deals joined</h3>
                        <p className="text-gray-500 mb-6 px-4">You haven't joined any group buy deals yet. Join community goals to unlock massive discounts!</p>
                        <Link to="/" className="inline-flex items-center gap-2 bg-brand-orange text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors">
                            Browse Live Deals <ArrowRight size={18} />
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {deals.map((deal) => {
                            const isExpired = new Date(deal.end_time) < new Date();
                            const progress = Math.min(100, (deal.current_count / deal.target_count) * 100);

                            return (
                                <div key={deal.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-5 flex flex-col md:flex-row gap-6">
                                        {/* Product Image */}
                                        <div className="w-full md:w-32 h-32 bg-gray-50 rounded-xl overflow-hidden shrink-0">
                                            <img
                                                src={deal.product_image}
                                                alt={deal.product_name}
                                                className="w-full h-full object-contain p-2"
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-grow min-w-0">
                                            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                                <h3 className="font-bold text-gray-900 truncate pr-4">{deal.product_name}</h3>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyles(deal.status, deal.end_time)}`}>
                                                    {deal.status === 'completed' ? 'Goal Reached' : (isExpired ? 'Expired' : 'In Progress')}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 font-medium">
                                                <span className="flex items-center gap-1.5"><Clock size={14} /> Ends {new Date(deal.end_time).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1.5"><Users size={14} /> Joined {new Date(deal.joined_at).toLocaleDateString()}</span>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-gray-600">Community Progress</span>
                                                    <span className="text-brand-orange">{deal.current_count} / {deal.target_count} joined</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${deal.status === 'completed' ? 'bg-green-500' : 'bg-brand-orange'}`}
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reward Box */}
                                        <div className="w-full md:w-48 bg-gray-50 rounded-2xl p-4 flex flex-col justify-between shrink-0 border border-gray-100">
                                            <div>
                                                <p className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Your Benefit</p>
                                                <p className="text-xl font-black text-green-600 leading-tight">{deal.discount_percentage}% OFF</p>
                                            </div>

                                            {deal.status === 'completed' ? (
                                                <div className="flex items-center gap-2 text-green-700 font-bold text-xs mt-3">
                                                    <CheckCircle size={14} /> Applied to Cart!
                                                </div>
                                            ) : isExpired ? (
                                                <div className="flex items-center gap-2 text-red-600 font-bold text-xs mt-3">
                                                    <AlertCircle size={14} /> Goal Not Met
                                                </div>
                                            ) : (
                                                <Link to={`/product/${deal.product_slug}/`} className="mt-3 w-full text-center py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                                                    Share & Invite
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AccountLayout>
    );
};

export default MyGroupDeals;
