import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, Timer, Zap } from 'lucide-react';
import { toastSuccess } from '../../utils/toast';


const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const GroupBuyWidget = ({ productId, onJoinSuccess }) => {
    const [deal, setDeal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState('');

    const fetchDeal = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/group-buys/product/${productId}`);
            setDeal(res.data);
        } catch (err) {
            console.error("Error fetching group deal", err);
        } finally {
            setLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchDeal();
    }, [fetchDeal]);

    useEffect(() => {
        if (!deal || deal.status !== 'active') return;

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const end = new Date(deal.end_time).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('EXPIRED');
                clearInterval(timer);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [deal]);

    const handleJoin = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) {
            return toastSuccess("Please login to join the group deal!");
        }
        try {
            const res = await axios.post(`${API_BASE_URL}/api/group-buys/join`,
                { dealId: deal.id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toastSuccess(res.data.message);
            fetchDeal();
            if (onJoinSuccess) onJoinSuccess();
        } catch (err) {
            toastSuccess(err.response?.data?.message || "Failed to join deal");
        }
    };

    if (loading || !deal) return null;

    const progress = (deal.current_count / deal.target_count) * 100;

    return (
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-black rounded-2xl p-5 border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom duration-500 my-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-black text-white uppercase tracking-widest">Live Group Deal</span>
                </div>
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/5">
                    <Timer size={12} className="text-red-400" />
                    <span className="text-[10px] font-bold text-red-100">{timeLeft}</span>
                </div>
            </div>

            <h3 className="text-lg font-black text-white mb-1 uppercase tracking-tighter">
                Unlock {deal.discount_percentage}% EXTRA OFF
            </h3>
            <p className="text-white/60 text-[11px] mb-4 leading-relaxed font-medium">
                Commit to buy this item. If {deal.target_count} people join, everyone gets the discount!
            </p>

            {/* Progress Bar */}
            <div className="space-y-2 mb-4">
                <div className="flex justify-between items-end">
                    <div className="flex items-center gap-1.5 text-white">
                        <Users size={14} className="text-indigo-400" />
                        <span className="text-sm font-black">{deal.current_count} <span className="text-white/40 text-xs">/ {deal.target_count} Joined</span></span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-300 uppercase">{Math.round(progress)}% Goal</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <button
                onClick={handleJoin}
                disabled={deal.status !== 'active' || timeLeft === 'EXPIRED'}
                className="w-full py-3 bg-white text-indigo-900 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-indigo-50 transition-all active:scale-95 shadow-lg"
            >
                {deal.status === 'completed' ? "GOAL REACHED!" : "Join Group Deal"}
            </button>
        </div>
    );
};

export default GroupBuyWidget;
