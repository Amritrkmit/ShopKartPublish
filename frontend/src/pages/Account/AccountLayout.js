import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Package, User, LogOut, ChevronRight, CreditCard, FileText, Coins, Users, Gift, ChevronDown } from 'lucide-react';
import { useAuth } from "../../context/AuthContext";

const AccountLayout = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, seller, logout, loading: authLoading } = useAuth();
    const [expandedSection, setExpandedSection] = useState('account');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [hasJoinedDeals, setHasJoinedDeals] = useState(false);
    const [pendingRewardsCount, setPendingRewardsCount] = useState(0);

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        const fetchDeals = async () => {
            try {
                const token = localStorage.getItem("userToken") || localStorage.getItem("sellerToken");
                if (token || document.cookie.includes('adminToken')) {
                    const [dealsRes, rewardsRes] = await Promise.all([
                        axios.get(`${API_BASE_URL}/group-buys/my-deals`, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            withCredentials: true
                        }),
                        axios.get(`${API_BASE_URL}/users/me/rewards`, {
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            withCredentials: true
                        })
                    ]);
                    setHasJoinedDeals(dealsRes.data.length > 0);
                    setPendingRewardsCount(rewardsRes.data.rewards?.length || 0);
                }
            } catch (err) {
                console.error("Failed to fetch deals/rewards for sidebar", err);
            }
        };
        if (user || seller) fetchDeals();
    }, [user, seller, API_BASE_URL]);

    // Redirect if not logged in
    useEffect(() => {
        if (!authLoading && !user && !seller && !document.cookie.includes('adminToken')) {
            navigate("/login/");
        }
    }, [user, seller, authLoading, navigate]);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const navLinkClass = ({ isActive }) =>
        `block px-6 py-3 text-sm text-gray-700 hover:bg-orange-50 transition-colors ${isActive ? 'bg-orange-50 text-brand-orange font-medium border-l-2 border-brand-orange' : ''
        }`;

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto py-6 px-2">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                    {/* Sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="bg-white shadow-sm">
                            {/* User Header */}
                            <div
                                className="flex items-center justify-between p-4 border-b cursor-pointer lg:cursor-default"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                                        <User size={24} className="text-brand-orange" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Hello,</p>
                                        <p className="font-semibold text-gray-900">{user?.name || 'User'}</p>
                                    </div>
                                </div>
                                <div className="lg:hidden text-gray-500">
                                    <ChevronDown size={20} className={`transition-transform duration-200 ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
                                <nav>
                                    {/* My Orders */}
                                    <NavLink
                                        to="/account/orders/"
                                        className="flex items-center justify-between px-6 py-4 text-sm text-gray-700 hover:bg-blue-50 transition-colors border-b"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Package size={18} className="text-brand-orange" />
                                            <span className="font-medium uppercase text-xs tracking-wide">My Orders</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400" />
                                    </NavLink>

                                    {/* My SuperCoins (Top Level) */}
                                    <NavLink
                                        to="/account/supercoins/"
                                        className="flex items-center justify-between px-6 py-4 text-sm text-gray-700 hover:bg-blue-50 transition-colors border-b"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Coins size={18} className="text-brand-orange" />
                                            <span className="font-medium uppercase text-xs tracking-wide">My SuperCoins</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded text-[10px] font-bold">NEW</span>
                                            <ChevronRight size={16} className="text-gray-400" />
                                        </div>
                                    </NavLink>

                                    {/* My Rewards */}
                                    <NavLink
                                        to="/account/rewards/"
                                        className="flex items-center justify-between px-6 py-4 text-sm text-gray-700 hover:bg-blue-50 transition-colors border-b"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Gift size={18} className="text-brand-orange" />
                                            <span className="font-medium uppercase text-xs tracking-wide">My Rewards</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {pendingRewardsCount > 0 && (
                                                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                                                    {pendingRewardsCount}
                                                </span>
                                            )}
                                            <ChevronRight size={16} className="text-gray-400" />
                                        </div>
                                    </NavLink>

                                    {/* My Group Rewards (Conditional & Top Level) */}
                                    {hasJoinedDeals && (
                                        <NavLink
                                            to="/account/my-deals/"
                                            className="flex items-center justify-between px-6 py-4 text-sm text-gray-700 hover:bg-blue-50 transition-colors border-b"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Users size={18} className="text-brand-orange" />
                                                <span className="font-medium uppercase text-xs tracking-wide">My Group Rewards</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-bold">LIVE</span>
                                                <ChevronRight size={16} className="text-gray-400" />
                                            </div>
                                        </NavLink>
                                    )}

                                    {/* Account Settings */}
                                    <div className="border-b">
                                        <button
                                            onClick={() => toggleSection('account')}
                                            className="w-full flex items-center justify-between px-6 py-4 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <User size={18} className="text-brand-orange" />
                                                <span className="font-medium uppercase text-xs tracking-wide">Account Settings</span>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                className={`text-gray-400 transition-transform ${expandedSection === 'account' ? 'rotate-90' : ''}`}
                                            />
                                        </button>
                                        {expandedSection === 'account' && (
                                            <div className="bg-gray-50">
                                                <NavLink to="/account/profile/" className={navLinkClass}>
                                                    Profile Information
                                                </NavLink>
                                                <NavLink to="/account/addresses/" className={navLinkClass}>
                                                    Manage Addresses
                                                </NavLink>
                                                <NavLink to="/account/notifications/" className={navLinkClass}>
                                                    Notifications
                                                </NavLink>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payments */}
                                    <div className="border-b">
                                        <button
                                            onClick={() => toggleSection('payments')}
                                            className="w-full flex items-center justify-between px-6 py-4 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <CreditCard size={18} className="text-brand-orange" />
                                                <span className="font-medium uppercase text-xs tracking-wide">Payments</span>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                className={`text-gray-400 transition-transform ${expandedSection === 'payments' ? 'rotate-90' : ''}`}
                                            />
                                        </button>
                                        {expandedSection === 'payments' && (
                                            <div className="bg-gray-50">
                                                <NavLink to="/account/gift-cards/" className={navLinkClass}>
                                                    <div className="flex justify-between items-center">
                                                        <span>Gift Cards</span>
                                                        <span className="text-xs text-green-600 font-medium">₹0</span>
                                                    </div>
                                                </NavLink>
                                                <NavLink to="/account/saved-upi/" className={navLinkClass}>
                                                    Saved UPI
                                                </NavLink>
                                                <NavLink to="/account/saved-cards/" className={navLinkClass}>
                                                    Saved Cards
                                                </NavLink>
                                            </div>
                                        )}
                                    </div>

                                    {/* My Stuff */}
                                    <div className="border-b">
                                        <button
                                            onClick={() => toggleSection('stuff')}
                                            className="w-full flex items-center justify-between px-6 py-4 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText size={18} className="text-brand-orange" />
                                                <span className="font-medium uppercase text-xs tracking-wide">My Stuff</span>
                                            </div>
                                            <ChevronRight
                                                size={16}
                                                className={`text-gray-400 transition-transform ${expandedSection === 'stuff' ? 'rotate-90' : ''}`}
                                            />
                                        </button>
                                        {expandedSection === 'stuff' && (
                                            <div className="bg-gray-50">
                                                <NavLink to="/account/coupons/" className={navLinkClass}>
                                                    My Coupons
                                                </NavLink>
                                                <NavLink to="/wishlist/" className={navLinkClass}>
                                                    My Wishlist
                                                </NavLink>
                                            </div>
                                        )}
                                    </div>

                                    {/* Logout */}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-6 py-4 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                                    >
                                        <LogOut size={18} />
                                        <span className="font-medium uppercase text-xs tracking-wide">Logout</span>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-3">
                        {children}
                    </main>

                </div>
            </div >
        </div >
    );
};

export default AccountLayout;
