import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Truck, Package, Info } from 'lucide-react';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const SellerVibe = ({ shopId, shopName }) => {
    const [vibe, setVibe] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!shopId) return;

        const fetchVibe = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/shops/${shopId}/vibe`);
                setVibe(res.data.vibe);
            } catch (err) {
                console.error("Failed to fetch shop vibe", err);
            } finally {
                setLoading(false);
            }
        };

        fetchVibe();
    }, [shopId]);

    if (loading) return (
        <div className="h-20 bg-gray-50 rounded-lg animate-pulse mb-6"></div>
    );

    if (!vibe || vibe.total_reviews === 0) return null;

    const getVibeColor = (score) => {
        if (score >= 80) return 'text-green-600 bg-green-50 border-green-100';
        if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-100';
        return 'text-orange-600 bg-orange-50 border-orange-100';
    };

    const colorClasses = getVibeColor(vibe.score);

    return (
        <div className={`p-4 rounded-xl ${colorClasses.replace('border', '')} transition-all`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck size={20} className="fill-current opacity-20" />
                    <span className="text-xs font-black uppercase tracking-widest">Seller Vibe Check</span>
                </div>
                <div className="text-xl font-black">
                    {vibe.score}% <span className="text-[10px] uppercase">Reliable</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/50">
                        <Truck size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase leading-none">Delivery</p>
                        <p className="text-xs font-black text-gray-900">{vibe.delivery}/5</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/50">
                        <Package size={14} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase leading-none">Packaging</p>
                        <p className="text-xs font-black text-gray-900">{vibe.packaging}/5</p>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center gap-1 text-[9px] font-medium opacity-60 italic">
                <Info size={10} />
                Based on {vibe.total_reviews} verified customer reports
            </div>
        </div>
    );
};

export default SellerVibe;
