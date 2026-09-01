import { useState, useEffect, useCallback } from "react";
import axios from "axios";

import { Users, ShoppingBag, DollarSign, Package, Store } from "lucide-react";
import SalesValueCard from "../components/SalesValueCard";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Reusable Stats Card Component
const DashboardCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        {subtext && <p className="text-xs text-green-500 mt-1 font-medium">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-full ${color} bg-opacity-10 text-opacity-100`}>
        <Icon size={24} className={color.replace('bg-', 'text-')} />
      </div>
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState({ users: 0, sellers: 0, orders: 0, sales: 0, products: 0 });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('6months');
  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/stats?range=${dateRange}`, { withCredentials: true });
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStats();
    // Real-time update every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const data = (stats.graphData || []).map(item => ({
    name: item.name,
    sales: parseFloat(item.sales) || 0,
    orders: parseInt(item.orders) || 0
  }));

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-semibold animate-pulse">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            Live Updates Active
          </div>
          <span className="text-sm text-gray-500">Overview of your store performance</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <DashboardCard
          title="Total Users"
          value={stats.users?.toLocaleString('en-IN') || 0}
          icon={Users}
          color="bg-blue-500"
          subtext="Registered Customers"
        />
        <DashboardCard
          title="Total Sellers"
          value={stats.sellers?.toLocaleString('en-IN') || 0}
          icon={Store}
          color="bg-emerald-500"
          subtext={stats.pendingSellers > 0 ? `${stats.pendingSellers} Pending Approval` : "All verified"}
        />
        <DashboardCard
          title="Total Orders"
          value={stats.orders?.toLocaleString('en-IN') || 0}
          icon={ShoppingBag}
          color="bg-orange-500"
          subtext={stats.todayOrders > 0 ? `+${stats.todayOrders} new today` : "No orders today"}
        />
        <DashboardCard
          title="Total Revenue"
          value={`₹${stats.sales?.toLocaleString('en-IN') || 0}`}
          icon={DollarSign}
          color="bg-green-500"
          subtext="Net platform volume"
        />
        <DashboardCard
          title="Cancellations"
          value={stats.cancelledOrders?.toLocaleString('en-IN') || 0}
          icon={ShoppingBag}
          color="bg-red-500"
          subtext="Cancelled by users/merchants"
        />
        <DashboardCard
          title="Active Products"
          value={stats.products?.toLocaleString('en-IN') || 0}
          icon={Package}
          color="bg-purple-500"
          subtext="In live catalog"
        />
      </div>

      {/* Sales Value Card - Matching Reference Design */}
      <SalesValueCard />

      {/* Statistics Summary Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">Statistics for selected period</p>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm border-gray-200 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="6months">Last 6 Months</option>
            <option value="year">This Year</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total Sales</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{data.reduce((sum, item) => sum + item.sales, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Total Orders</p>
            <p className="text-xl font-bold text-gray-900">
              {data.reduce((sum, item) => sum + item.orders, 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Average Order Value</p>
            <p className="text-xl font-bold text-gray-900">
              ₹{(data.reduce((sum, item) => sum + item.sales, 0) / Math.max(data.reduce((sum, item) => sum + item.orders, 0), 1)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
