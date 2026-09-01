import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Crown, Zap, Truck, Headphones, Clock, Star, ChevronRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const PlusZone = () => {
    const [balance, setBalance] = useState(0);
    const [, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("userToken");
                const storedUser = localStorage.getItem("user");
                if (storedUser) setUser(JSON.parse(storedUser));

                if (token) {
                    const res = await axios.get(`${API_BASE_URL}/users/me/supercoins`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setBalance(res.data.balance);
                }
            } catch (err) {
                console.error("Failed to fetch Plus Zone data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const benefits = [
        {
            icon: Truck,
            title: "Free Delivery",
            description: "No more platform fees or delivery charges on Plus-F-assured items.",
            color: "text-blue-500",
            bg: "bg-blue-50"
        },
        {
            icon: Zap,
            title: "Early Access",
            description: "Get early access to The Big Billion Days and other major sales.",
            color: "text-amber-500",
            bg: "bg-amber-50"
        },
        {
            icon: Headphones,
            title: "Priority Support",
            description: "Get priority customer support for any queries or issues.",
            color: "text-purple-500",
            bg: "bg-purple-50"
        },
        {
            icon: Trophy,
            title: "Exclusive Rewards",
            description: "Unlock premium rewards and entertainment subscriptions using SuperCoins.",
            color: "text-rose-500",
            bg: "bg-rose-50"
        }
    ];

    const rewards = [
        { title: "YouTube Premium", cost: 50, image: "https://www.gstatic.com/youtube/img/branding_v2/premium/premium_logo_v2.png", category: "Entertainment" },
        { title: "Disney+ Hotstar", cost: 100, image: "https://secure-media.hotstar.com/static/brand/disney-hotstar-logo-dark.png", category: "Movies" },
        { title: "Zomato Gold", cost: 200, image: "https://b.zmtcdn.com/images/logo/logo-zomato-gold.png", category: "Dining" }
    ];

    return (
        <div className="min-h-screen bg-[#F1F3F6] pb-12">
            {/* Nav Header */}
            <div className="bg-white border-b py-3 px-4 md:px-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="text-gray-600 hover:text-black transition-colors font-medium text-sm">Home</Link>
                        <ChevronRight size={14} className="text-gray-400" />
                        <span className="font-bold text-sm text-brand-orange italic">Plus Zone</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-6">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 text-white p-8 md:p-12 shadow-2xl mb-8">
                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-orange/20 to-transparent blur-3xl pointer-events-none"></div>
                    <Crown size={300} className="absolute -right-20 -bottom-20 text-white/[0.03] rotate-12 -z-0" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-brand-orange p-2 rounded-xl shadow-lg shadow-brand-orange/30">
                                    <Crown className="text-white fill-current" size={24} />
                                </div>
                                <span className="text-sm font-black uppercase tracking-[0.3em] text-brand-orange">Flipkart Plus Member</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                                Welcome to the <br />
                                <span className="text-brand-orange italic">Exclusive</span> Zone, {user?.name?.split(' ')[0] || 'User'}
                            </h1>
                            <p className="text-slate-400 max-w-md font-medium">
                                Enjoy curated benefits, early access, and priority rewards. Being a Plus member pays for itself.
                            </p>
                        </div>

                        <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl md:min-w-[320px] shadow-2xl">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Available Balance</p>
                            <div className="flex items-end gap-3 mb-6">
                                <h2 className="text-5xl font-black text-white">{balance}</h2>
                                <span className="text-brand-orange font-bold text-lg mb-1">SuperCoins</span>
                            </div>
                            <button
                                onClick={() => window.location.href = '/account/supercoins/'}
                                className="w-full py-4 bg-brand-orange hover:bg-orange-600 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2"
                            >
                                <Trophy size={18} />
                                VIEW COIN HISTORY
                            </button>
                        </div>
                    </div>
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    {benefits.map((benefit, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 group">
                            <div className={`w-14 h-14 ${benefit.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed font-medium">
                                {benefit.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Exclusive Rewads */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900">Plus Exclusive Rewards</h2>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Claim using your SuperCoins</p>
                        </div>
                        <button className="text-brand-orange font-black text-sm flex items-center gap-1 hover:underline">
                            SEE ALL REWARDS <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {rewards.map((reward, idx) => (
                            <div key={idx} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-gray-100 flex flex-col group">
                                <div className="h-40 bg-gray-50 p-8 flex items-center justify-center">
                                    <img src={reward.image} alt={reward.title} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="p-6">
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest bg-gray-50 px-2 py-1 rounded-full">{reward.category}</span>
                                    <h3 className="text-lg font-black text-gray-900 mt-3">{reward.title}</h3>
                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-400">CLAIM FOR</span>
                                            <span className="text-xl font-black text-brand-orange flex items-center gap-1">
                                                {reward.cost} <Clock size={16} className="fill-current" />
                                            </span>
                                        </div>
                                        <button className="px-6 py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-brand-orange transition-colors">
                                            CLAIM NOW
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Coin Earning Section */}
                <div className="bg-gradient-to-br from-brand-orange to-red-500 rounded-[2rem] p-8 md:p-12 text-white shadow-xl shadow-brand-orange/20 overflow-hidden relative">
                    <Star size={200} className="absolute -right-20 -top-20 opacity-10 rotate-12" />
                    <div className="relative z-10 max-w-2xl">
                        <h2 className="text-3xl font-black mb-4">Want more SuperCoins?</h2>
                        <p className="text-orange-100 font-bold text-lg mb-8 leading-relaxed">
                            Keep shopping on ShopKart! For every ₹100 you spend, you earn 2 SuperCoins as a Plus member. Double the regular rate!
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <button onClick={() => window.location.href = '/'} className="px-10 py-4 bg-white text-brand-orange font-black rounded-2xl shadow-xl shadow-black/10 hover:scale-105 transition-transform">
                                SHOP NOW
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlusZone;
