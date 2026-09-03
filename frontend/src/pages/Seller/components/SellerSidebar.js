import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
    LayoutDashboard,
    Store,
    ShoppingCart,
    Package,
    DollarSign,
    BarChart3,
    LifeBuoy,
    LogOut,
    PlusCircle,
    Bell,
    Tag,
    Wand2
} from 'lucide-react';
import './SellerSidebar.css';

const SellerSidebar = ({ open, setOpen }) => {
    const { logout, seller } = useAuth();
    const navigate = useNavigate();
    const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

    const handleLogout = () => {
        logout('seller');
        navigate('/seller/login/');
    };

    const navigation = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/seller/dashboard/' },
        { name: 'Shop Profile', icon: Store, path: '/seller/profile/' },
        { name: 'Products', icon: Package, path: '/seller/products/' },
        { name: 'Customized Products', icon: Wand2, path: '/seller/customized-products/' },
        { name: 'Add Product', icon: PlusCircle, path: '/seller/products/add/' },
        // { name: 'Attributes', icon: Sliders, path: '/seller/attributes/' },
        { name: 'Brands', icon: Tag, path: '/seller/brands/' },
        { name: 'Orders', icon: ShoppingCart, path: '/seller/orders/' },
        { name: 'Customized Orders', icon: Wand2, path: '/seller/customized-orders/' },
        { name: 'Earnings', icon: DollarSign, path: '/seller/earnings/' },
        { name: 'Reports', icon: BarChart3, path: '/seller/reports/' },
        { name: 'Notifications', icon: Bell, path: '/seller/notifications/' },
        { name: 'Support', icon: LifeBuoy, path: '/seller/support/' },
    ];

    return (
        <>
            {/* Mobile Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity lg:hidden ${open ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-100 shadow-xl z-50 transition-transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
                <div className="flex flex-col h-full">
                    {/* Brand - Aligned with Admin 'ADD' logo style */}
                    <div className="h-16 flex items-center px-8 border-b border-gray-100">
                        {seller?.logo_url ? (
                            <div className="flex items-center gap-3">
                                <img
                                    src={`${API_BASE_URL}${seller.logo_url}`}
                                    alt={seller.shop_name || 'Logo'}
                                    className="h-10 w-auto object-contain max-w-[120px]"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                />
                                <span className="hidden text-2xl font-black italic uppercase tracking-tighter text-slate-900">
                                    {seller.shop_name?.substring(0, 3) || 'ADD'}
                                </span>
                            </div>
                        ) : (
                            <span className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">
                                {seller?.shop_name?.substring(0, 3) || 'ADD'}
                            </span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                        <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Main Menu</p>
                        {navigation.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                onClick={() => setOpen(false)}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                                    ${isActive
                                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                                        : 'text-slate-600 hover:bg-orange-50 hover:text-orange-600'}
                                `}
                            >
                                <item.icon size={20} />
                                <span className="font-bold text-sm">{item.name}</span>
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer / Logout */}
                    <div className="p-4 border-t border-gray-100">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <LogOut size={20} />
                            <span className="font-bold text-sm">Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default SellerSidebar;
