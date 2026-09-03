import { LayoutDashboard, ShoppingCart, Package, Layers, Image as ImageIcon, User, MessageSquare, Grid, ShieldCheck, Code, Activity, Gift, Tag, TrendingUp, Database, Bell, MousePointer, Target, Video, Users, Wand2, Server } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Logout from "./Logout";
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

export default function Sidebar({ open, setOpen }) {
  const location = useLocation();

  const handleGenerateSitemap = async () => {
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/sitemap/generate`, {}, { withCredentials: true });
      toast.success(data.message || 'Sitemap generated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate sitemap');
    }
  };

  const menuItems = [
    { title: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/admin/dashboard/" },
    { title: "Analytics", icon: <TrendingUp size={20} />, href: "/admin/analytics/" },
    { title: "Orders", icon: <ShoppingCart size={20} />, href: "/admin/orders/" },
    { title: "Customized Orders", icon: <Wand2 size={20} />, href: "/admin/orders/customized/" },
    { title: "Products", icon: <Package size={20} />, href: "/admin/products/" },
    { title: "Customized Products", icon: <Wand2 size={20} />, href: "/admin/products/customized/" },
    { title: "Categories", icon: <Layers size={20} />, href: "/admin/category/" },
    { title: "Subcategories", icon: <Grid size={20} />, href: "/admin/subcategory/" },
    { title: "Brands", icon: <ShieldCheck size={20} />, href: "/admin/brands/" },
    // { title: "Attributes", icon: <Settings size={20} />, href: "/admin/attributes/" },
    { title: "Users", icon: <User size={20} />, href: "/admin/users/" },
    { title: "Sliders", icon: <ImageIcon size={20} />, href: "/admin/slider/" },
    { title: "Sellers", icon: <ShieldCheck size={20} />, href: "/admin/verifications/" },
    { title: "Home Highlights", icon: <LayoutDashboard size={20} />, href: "/admin/collections/" },
    { title: "Home Promos", icon: <Grid size={20} />, href: "/admin/promos/" },
    { title: "Price Hunt", icon: <Target size={20} />, href: "/admin/price-hunt/" },
    { title: "Watch & Shop", icon: <Video size={20} />, href: "/admin/video-discovery/" },
    { title: "Group Deals", icon: <Users size={20} />, href: "/admin/group-buys/" },
    { title: "Chat Support", icon: <MessageSquare size={20} />, href: "/admin/chat/" },
    { title: "Script Manager", icon: <Code size={20} />, href: "/admin/scripts/" },
    { title: "Cache Manager", icon: <Database size={20} />, href: "/admin/cache/" },
    { title: "Event Explorer", icon: <Activity size={20} />, href: "/admin/events/" },
    { title: "Heatmap (UX)", icon: <MousePointer size={20} />, href: "/admin/heatmap/" },
    { title: "Consent Logs", icon: <ShieldCheck size={20} />, href: "/admin/consents/" },
    { title: "Coupon Manager", icon: <Tag size={20} />, href: "/admin/coupons/" },
    { title: "Marketing Popups", icon: <Gift size={20} />, href: "/admin/popups/" },
    { title: "Profile", icon: <User size={20} />, href: "/admin/profile/" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-300 ${open ? "opacity-100 visible" : "opacity-0 invisible"}`}
        onClick={() => setOpen(false)}
      ></div>

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100">
          <Link to="/admin/dashboard/" className="text-2xl font-bold text-[#dc3545]">
            AdminPanel
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-4rem)]">
          <div className="mb-6">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Menu
            </p>
            {menuItems.map((item, idx) => {
              // Precise matching: Main tabs stay active for their sub-pages (like details), 
              // but don't overlap with specific sub-sections (like /customized/)
              let isActive = location.pathname.startsWith(item.href);

              if (item.href === "/admin/orders/" && location.pathname.startsWith("/admin/orders/customized/")) {
                isActive = false;
              }
              if (item.href === "/admin/products/" && location.pathname.startsWith("/admin/products/customized/")) {
                isActive = false;
              }
              return (
                <Link
                  key={idx}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                    ? "bg-[#dc3545] text-white shadow-md shadow-blue-200"
                    : "text-gray-600 hover:bg-blue-50 hover:text-[#dc3545]"
                    }`}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>

          <div className="mb-6">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Admin & System Health
            </p>
            <Link
              to="/admin/system-health/"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === '/admin/system-health/'
                ? "bg-[#dc3545] text-white shadow-md"
                : "text-gray-600 hover:bg-blue-50 hover:text-[#dc3545]"
                }`}
            >
              <Activity size={20} />
              <span>Backend Control</span>
            </Link>
            <Link
              to="/admin/alerts/"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === '/admin/alerts/'
                ? "bg-[#dc3545] text-white shadow-md"
                : "text-gray-600 hover:bg-blue-50 hover:text-[#dc3545]"
                }`}
            >
              <Bell size={20} />
              <span>Alerts & Notify</span>
            </Link>
            <Link
              to="/admin/hadoop/"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${location.pathname === '/admin/hadoop/'
                ? "bg-[#dc3545] text-white shadow-md"
                : "text-gray-600 hover:bg-blue-50 hover:text-[#dc3545]"
                }`}
            >
              <Server size={20} />
              <span>Hadoop Monitor</span>
            </Link>

            <button
              onClick={handleGenerateSitemap}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-[#dc3545] transition-all duration-200 text-left"
            >
              <Database size={20} />
              <span>Generate Sitemap</span>
            </button>
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-gray-100">
            <Logout
              buttonClass="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            />
          </div>
        </nav>
      </aside>
    </>
  );
}
