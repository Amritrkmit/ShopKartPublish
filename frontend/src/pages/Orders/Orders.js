import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import OrderCard from "../../components/OrderCard/OrderCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Breadcrumb from "../../components/Breadcrumb/Breadcrumb";
import AccountLayout from "../Account/AccountLayout";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { user } = useAuth();

  const fetchOrders = useCallback(async (page = 1, search = "") => {
    setLoading(true);
    try {
      if (!user) {
        // setError("You are not logged in");
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/orders`, {
        withCredentials: true,
        params: { page, limit: 10, search }
      });

      setOrders(res.data.orders);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Handle search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (user) {
      fetchOrders(currentPage, debouncedSearch);
    }
  }, [currentPage, debouncedSearch, user, fetchOrders]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) return <AccountLayout><p className="text-red-500">{error}</p></AccountLayout>;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'My Account', href: '/account/profile/' },
    { label: 'My Orders' }
  ];

  return (
    <>
      <Breadcrumb items={breadcrumbItems} />
      <AccountLayout>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold">My Orders</h2>
            {pagination.total > 0 && (
              <span className="text-sm text-gray-500">Total {pagination.total} orders</span>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64 lg:w-80">
            <input
              type="text"
              placeholder="Search your orders..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
          </div>
        ) : orders.length === 0 ? (
          <p className="text-gray-500 bg-white p-8 text-center rounded-sm shadow-sm border border-gray-100">
            You haven't placed any orders yet.
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order.orderId} order={order} />
            ))}

            {/* Pagination Controls - Matching ProductList style */}
            {pagination.totalPages > 1 && (
              <div className="bg-white rounded-sm border border-gray-100 px-6 py-4 mt-8 flex items-center justify-between shadow-sm">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(pagination.totalPages)].map((_, idx) => {
                      const pageNum = idx + 1;
                      // Show limited pages: first, last, and around current
                      if (
                        pageNum === 1 ||
                        pageNum === pagination.totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNum
                              ? "bg-brand-orange text-white"
                              : "text-gray-600 hover:bg-gray-100"
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === currentPage - 2 ||
                        pageNum === currentPage + 2
                      ) {
                        return <span key={pageNum} className="text-gray-400 px-1">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </AccountLayout>
    </>
  );
};

export default Orders;
