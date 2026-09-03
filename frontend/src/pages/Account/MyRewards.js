import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Gift, Sparkles, Clock } from 'lucide-react';
import AccountLayout from './AccountLayout';
import { toastSuccess, toastError } from '../../utils/toast';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const MyRewards = () => {
    const [pendingRewards, setPendingRewards] = useState([]);

    const [loading, setLoading] = useState(true);
    const [scratching, setScratching] = useState(null);

    useEffect(() => {
        fetchRewards();
    }, []);

    const fetchRewards = async () => {
        try {
            const token = localStorage.getItem("userToken");
            const res = await axios.get(`${API_BASE_URL}/users/me/rewards`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const pending = res.data.rewards || [];
            setPendingRewards(pending);

            // Fetch scratched rewards (we'll need to add this to backend or filter from transactions)
            // For now, we'll just show pending ones
        } catch (err) {
            console.error("Failed to fetch rewards", err);
            toastError("Failed to load rewards");
        } finally {
            setLoading(false);
        }
    };

    const handleScratch = async (rewardId) => {
        setScratching(rewardId);
        try {
            const token = localStorage.getItem("userToken");
            const res = await axios.post(
                `${API_BASE_URL}/users/me/rewards/${rewardId}/scratch`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toastSuccess(`🎉 You won ${res.data.amount} SuperCoins!`);

            // Remove from pending
            setPendingRewards(prev => prev.filter(r => r.id !== rewardId));

            // Refresh to update balance
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (err) {
            console.error("Failed to scratch reward", err);
            toastError(err.response?.data?.message || "Failed to scratch card");
        } finally {
            setScratching(null);
        }
    };

    return (
        <AccountLayout>
            <div className="max-w-4xl">
                {/* Header */}
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl p-8 text-white shadow-2xl mb-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                                <Gift className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.2em] opacity-80">Reward Zone</span>
                        </div>
                        <h1 className="text-4xl font-black mb-2">My Scratch Cards</h1>
                        <p className="text-purple-100 font-medium">
                            {pendingRewards.length} pending reward{pendingRewards.length !== 1 ? 's' : ''} waiting to be scratched!
                        </p>
                    </div>
                    <Sparkles className="absolute -right-4 -top-4 w-48 h-48 opacity-10 rotate-12" />
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 mb-8">
                    <Gift className="text-blue-500 shrink-0" size={20} />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        Scratch your reward cards to reveal SuperCoins! These coins are valid for <b>1 year</b> and can be used during checkout.
                    </p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2].map(i => (
                            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-3xl"></div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Pending Rewards */}
                        {pendingRewards.length > 0 ? (
                            <div className="mb-12">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <Clock size={24} className="text-orange-500" />
                                    Pending Scratch Cards
                                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                                        {pendingRewards.length}
                                    </span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {pendingRewards.map((reward) => (
                                        <div
                                            key={reward.id}
                                            className="relative group"
                                        >
                                            <div className="bg-gradient-to-br from-gray-400 to-gray-600 rounded-3xl p-8 text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 cursor-pointer relative overflow-hidden"
                                                onClick={() => handleScratch(reward.id)}
                                            >
                                                {/* Scratch overlay - this is what user sees before clicking */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center z-10">
                                                    <div className="text-center">
                                                        <Sparkles className="w-16 h-16 mx-auto mb-3 animate-pulse" />
                                                        <p className="text-2xl font-black uppercase tracking-wider">Scratch Me!</p>
                                                        <p className="text-sm opacity-80 mt-2">Click to reveal</p>
                                                    </div>
                                                </div>

                                                {/* Loading spinner during scratch */}
                                                {scratching === reward.id && (
                                                    <div className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 text-center">
                                                From order on {new Date(reward.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Gift className="text-gray-300" size={40} />
                                </div>
                                <h3 className="font-bold text-gray-800 mb-2 text-xl">No Pending Rewards</h3>
                                <p className="text-gray-500 text-sm max-w-md mx-auto">
                                    Place an order to earn scratch card rewards! Each order comes with a surprise SuperCoin reward.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AccountLayout>
    );
};

export default MyRewards;
