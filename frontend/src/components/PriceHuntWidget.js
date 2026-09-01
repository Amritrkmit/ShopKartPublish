import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import useCountdown from '../hooks/useCountdown';
import { Timer, Zap } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PriceHuntWidget = () => {
    const [hunts, setHunts] = useState([]);
    const [settings, setSettings] = useState({
        title: "THE GREAT PRICE HUNT",
        description: "Find the hidden treasure items across our store. Visiting a hunt item unlocks an exclusive 20% OFF coupon instantly!",
        discount_text: "20% OFF",
        hunt_link: "/categories", // Default link
        is_active: "true",
        hunt_expiry: null
    });
    const [loading, setLoading] = useState(true);

    const countdown = useCountdown(settings.hunt_expiry);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [huntsRes, settingsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/hunt/active`),
                    axios.get(`${API_BASE_URL}/api/settings/price_hunt`)
                ]);

                setHunts(huntsRes.data);
                if (settingsRes.data && Object.keys(settingsRes.data).length > 0) {
                    setSettings(prev => ({ ...prev, ...settingsRes.data }));
                }
            } catch (err) {
                console.error("Failed to load hunt data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading || hunts.length === 0 || settings.is_active === 'false' || countdown.isExpired) return null;

    return (
        <div className="mx-2 mt-6">
            <div className="bg-gradient-to-br from-[#1a1c2c] via-[#4a192c] to-black rounded-2xl p-6 shadow-2xl overflow-hidden relative border border-white/5">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full -ml-20 -mb-20"></div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Info */}
                    <div className="text-center lg:text-left space-y-6">
                        <div>
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                                <div className="inline-flex items-center gap-2 bg-red-500/20 px-3 py-1 rounded-full border border-red-400/30">
                                    <Zap size={12} className="text-red-400 fill-current" />
                                    <span className="text-[10px] font-black text-red-300 uppercase tracking-widest">Flash Hunt Active</span>
                                </div>

                                {settings.hunt_expiry && (
                                    <div className="inline-flex items-center gap-2 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-400/30">
                                        <Timer size={12} className="text-yellow-400" />
                                        <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest">
                                            Ending In: {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
                                        </span>
                                    </div>
                                )}
                            </div>

                            <h2 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase leading-tight">
                                {settings.title.split(' ').slice(0, 1)} <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">{settings.title.split(' ').slice(1).join(' ')}</span>
                            </h2>
                            <p className="text-red-100/70 text-sm max-w-lg leading-relaxed font-medium mx-auto lg:mx-0">
                                {settings.description.split(settings.discount_text)[0]}
                                <span className="text-white font-bold">{settings.discount_text}</span>
                                {settings.description.split(settings.discount_text)[1] || ''}
                            </p>
                        </div>

                        {/* Stats & Action */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
                            <Link
                                to={settings.hunt_link}
                                className="text-[11px] font-black text-white px-8 py-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl hover:shadow-[0_0_20px_rgba(220,53,69,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-wider"
                            >
                                Start Hunting
                            </Link>
                            <div className="flex gap-4 text-[10px] font-bold text-white/40">
                                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-2 rounded-lg border border-white/5 backdrop-blur-md">
                                    <span className="text-red-400">●</span> {hunts.length} Targets
                                </div>
                                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-2 rounded-lg border border-white/5 backdrop-blur-md">
                                    <span className="text-orange-400">●</span> Live Rewards
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Hunt Targets (Silhouettes) */}
                    <div className="flex justify-center lg:justify-end gap-5">
                        {hunts.map((hunt, idx) => (
                            <div key={hunt.id} className="group relative">
                                <Link to={`/product/${hunt.slug || hunt.id}`} className="block">
                                    <div className="w-28 h-28 bg-white/5 rounded-3xl border border-white/10 p-3 backdrop-blur-sm group-hover:bg-white/10 transition-all group-hover:-translate-y-2 group-hover:scale-110 shadow-2xl duration-500 relative overflow-hidden group-hover:border-red-500/50">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <img
                                            src={hunt.image.startsWith('http') ? hunt.image : `${API_BASE_URL.replace('/api', '')}${hunt.image}`}
                                            alt="Mystery Item"
                                            className="w-full h-full object-contain opacity-20 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-500 mix-blend-lighten scale-90 group-hover:scale-100"
                                            onError={(e) => e.target.style.display = 'none'}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <Zap className="text-white fill-current animate-pulse" size={24} />
                                        </div>
                                    </div>
                                    <div className="mt-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-red-400 transition-colors">
                                        Target {idx + 1}
                                    </div>
                                </Link>

                                {/* Connection lines for visual flair */}
                                {idx < hunts.length - 1 && (
                                    <div className="hidden lg:block absolute top-[50px] -right-5 w-5 h-[1px] bg-gradient-to-r from-red-500/50 to-transparent"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PriceHuntWidget;
