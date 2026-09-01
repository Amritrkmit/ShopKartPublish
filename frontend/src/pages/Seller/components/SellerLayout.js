import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import SellerSidebar from "./SellerSidebar";
import { Menu, Bell, User, Search, Grid3x3 } from "lucide-react";
import "./SellerDesignSystem.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + "/api";

const SellerLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("sellerToken");
            if (!token) {
                navigate("/seller/login/");
                return;
            }

            try {
                // Fetch profile from /api/seller/profile
                const res = await axios.get(`${API_BASE_URL}/seller/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data) {
                    console.log('🔐 Seller data fetched:', res.data);
                    setSeller(res.data);
                } else {
                    console.warn("User is logged in but no seller profile found. Redirecting to onboarding.");
                    navigate("/seller-onboarding/");
                }
            } catch (err) {
                console.error("❌ SellerLayout Auth Error:", err);
                if (err.response?.status === 401) {
                    console.warn("Unauthorized, clearing session");
                    localStorage.removeItem("sellerToken");
                    localStorage.removeItem("seller");
                    navigate("/seller/login/");
                } else if (err.response?.status === 404) {
                    console.warn("Seller authenticated but no shop found. Redirecting to onboarding.");
                    navigate("/seller-onboarding/");
                } else {
                    console.error("Unexpected error, possibly 500 or Network Error");
                    // Force navigation to login on critical failure to avoid spinner loop
                    // But first, let's just stop loading to show the UI (or an error message)
                    // Actually, if it's a 500, we might want to stay on page and show error dump?
                    // For now, let's just finish loading so the UI renders (potentially broken, but better than spinner)
                    // navigate("/seller/login/"); 
                }
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [navigate]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#f9fafb] overflow-hidden text-gray-900 seller-dashboard-root font-sans">
            <SellerSidebar open={sidebarOpen} setOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-64 relative">
                {/* Header - Ported from AdminHeader.js style */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
                    {/* Left - Mobile Menu */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg lg:hidden"
                        >
                            <Menu size={20} />
                        </button>
                    </div>

                    {/* Center - Search Bar */}
                    <div className="flex-1 max-w-xl mx-8 md:block hidden">
                        <div className="relative group">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>

                    {/* Right - Actions */}
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors md:block hidden">
                            <Grid3x3 size={20} />
                        </button>

                        <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-100">
                            <div className="md:flex flex-col items-end hidden text-right select-none">
                                <span className="text-xs font-bold text-gray-900 leading-none">{seller?.shop_name || 'Store Admin'}</span>
                                <span className={`text-[9px] font-black uppercase tracking-wider mt-1 ${seller?.status === 'APPROVED' ? 'text-green-600' : 'text-orange-500'
                                    }`}>
                                    {seller?.status || 'PENDING'}
                                </span>
                            </div>

                            <button
                                onClick={() => navigate("/seller/profile/")}
                                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold hover:shadow-md transition-all overflow-hidden border border-gray-100"
                            >
                                {seller?.logo_url ? (
                                    <img
                                        src={`${API_BASE_URL.replace('/api', '')}${seller.logo_url}`}
                                        alt="Shop"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.onerror = null; e.target.src = ""; }}
                                    />
                                ) : (
                                    <User size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                    <Outlet context={{ seller, setSeller }} />
                </main>
            </div>
        </div>
    );
};

export default SellerLayout;
