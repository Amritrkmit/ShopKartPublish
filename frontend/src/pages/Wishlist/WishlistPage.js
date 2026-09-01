import React, { useEffect, useState } from "react";
import axios from "axios";
import { toastError, axiosErrorMessage } from "../../utils/toast";
import AccountLayout from "../Account/AccountLayout";
import { useNavigate } from "react-router-dom";
import useWishlist from "../../hooks/useWishlist";
import { generateWishlistProductUrl } from "../../utils/productUrl";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const WishlistPage = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch wishlist products
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        if (!user) {
          //   toastError("You must be logged in to view wishlist.");
          //   setLoading(false);
          //   return;
          // User might be null initially while loading. Wait for auth? 
          // But user is initialized in AuthContext.
          // If user is null, we can't fetch. 
          // If we redirect here, it might be abrupt. 
          // Better: AccountLayout handles auth protection usually? 
          // Use user check.
          // If usage of AccountLayout implies protected route, user should exist.
          setLoading(false);
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/users/wishlist`, {
          withCredentials: true,
        });

        console.log("Wishlist API response:", res.data);

        // Normalize response
        if (Array.isArray(res.data)) {
          setWishlist(res.data);
        } else if (res.data.wishlist && Array.isArray(res.data.wishlist)) {
          setWishlist(res.data.wishlist);
        } else {
          setWishlist([]); // fallback
        }

      } catch (err) {
        // toastError(axiosErrorMessage(err, "Failed to fetch wishlist"));
        // Silently fail if 401?
        if (err.response?.status !== 401) {
          toastError(axiosErrorMessage(err, "Failed to fetch wishlist"));
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchWishlist();
    } else {
      // If not logged in, maybe wait? Or stop loading
      const timer = setTimeout(() => setLoading(false), 500); // Small fallback
      return () => clearTimeout(timer);
    }
  }, [user]);


  const parsePrice = (value) => Number(String(value).replace(/,/g, ""));

  const formatINR = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  const { removeFromWishlist } = useWishlist();

  const handleRemove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      // Remove locally from the displayed full-object list
      setWishlist((prev) => prev.filter((item) => item.id !== productId));
    } catch (err) {
      console.error("Failed to remove item:", err);
    }
  };



  if (loading) {
    return (
      <AccountLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-t-blue-600 border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading wishlist...</p>
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="bg-white shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-medium text-gray-800">
            My Wishlist ({wishlist.length})
          </h2>
        </div>

        {wishlist.length === 0 ? (
          <div className="text-center py-20 px-6">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-gray-500 text-lg mb-4">Your wishlist is empty.</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2 bg-[#dc3545] text-white rounded-sm hover:bg-blue-700 transition shadow"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {wishlist.map((product) => (
              <div
                key={product.id}
                className="flex items-start gap-4 p-6 hover:bg-gray-50 transition group relative"
              >
                {/* Product Image */}
                <div
                  className="flex-shrink-0 w-28 h-28 cursor-pointer"
                  onClick={() => {
                    const url = generateWishlistProductUrl(product);
                    navigate(url);
                  }}
                >
                  <img
                    src={`${API_BASE_URL}${product.image}`}
                    alt={product.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-base font-normal text-gray-800 hover:text-[#dc3545] cursor-pointer line-clamp-2 mb-2"
                    onClick={() => {
                      const url = generateWishlistProductUrl(product);
                      navigate(url);
                    }}
                  >
                    {product.name}
                  </h3>

                  {/* Assured Badge (if available) */}
                  {product.assured && (
                    <div className="flex items-center gap-1 mb-2">
                      <img
                        src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/fa_62673a.png"
                        alt="Assured"
                        className="h-5"
                      />
                    </div>
                  )}

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-end gap-3 mb-1">
                      {(() => {
                        const price = parsePrice(product.price);
                        const salePrice = product.sale_price ? parsePrice(product.sale_price) : 0;
                        const hasDiscount = salePrice > 0 && salePrice < price;

                        return (
                          <>
                            <span className="text-xl font-bold text-gray-900">
                              {formatINR(hasDiscount ? salePrice : price)}
                            </span>

                            {hasDiscount && (
                              <>
                                <span className="text-gray-500 !line-through text-sm">
                                  {formatINR(price)}
                                </span>
                                <span className="text-green-600 font-bold text-sm">
                                  {Math.round(((price - salePrice) / price) * 100)}% off
                                </span>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Stock Status */}
                  {product.stock_status === 'out_of_stock' && (
                    <p className="text-xs text-red-600 font-medium mb-2">Currently unavailable</p>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemove(product.id)}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 transition"
                  title="Remove from wishlist"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default WishlistPage;
