import { formatPrice, parsePrice } from "../../utils/format";
import { generateProductUrl } from "../../utils/productUrl";
import React, { useState } from "react";
import useCart from "../../hooks/useCart";
import axios from 'axios';
import { Link, useNavigate } from "react-router-dom";
import { toastSuccess, toastError, axiosErrorMessage } from "../../utils/toast";
import RemoveItemModal from "../../components/RemoveItemModal";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const CartPage = () => {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const navigate = useNavigate();
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [points, setPoints] = useState(0);

  // Remove Item State
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  const confirmRemoveItem = (item) => {
    setItemToRemove(item);
    setShowRemoveModal(true);
  };

  const handleFinalRemove = () => {
    if (itemToRemove) {
      removeFromCart(itemToRemove.id);
      setItemToRemove(null);
      setShowRemoveModal(false);
    }
  };

  // Fetch points on mount
  React.useEffect(() => {
    const fetchPoints = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/users/me/supercoins`, {
          withCredentials: true
        });
        setPoints(res.data.balance || 0);
      } catch (err) {
        console.error("Failed to fetch points", err);
      }
    };
    fetchPoints();
  }, []);

  // Coupon handling via API
  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode.trim()) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/api/coupons/validate`, {
        code: couponCode,
        order_value: totalSellingPrice
      });

      if (res.data.success) {
        setAppliedCoupon(res.data.coupon);
        toastSuccess('Coupon applied successfully!');
        setCouponCode('');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon code");
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toastSuccess('Coupon removed');
  };

  // Calculate coupon discount
  const calculateCouponDiscount = () => {
    if (!appliedCoupon) return 0;

    if (appliedCoupon.discount_type === 'flat') {
      return appliedCoupon.discount_value;
    } else {
      const percentDiscount = (totalSellingPrice * appliedCoupon.discount_value) / 100;
      return appliedCoupon.max_discount_value ? Math.min(percentDiscount, appliedCoupon.max_discount_value) : percentDiscount;
    }
  };

  // Restore Layout Calculations
  const totalMRP = cart.reduce((sum, item) => sum + (parsePrice(item.price) || parsePrice(item.sale_price)) * item.quantity, 0);
  const totalSellingPrice = cart.reduce((sum, item) => sum + (item.effectivePrice || parsePrice(item.sale_price) || parsePrice(item.price)) * item.quantity, 0);

  const discount = totalMRP - totalSellingPrice;
  const couponDiscount = calculateCouponDiscount();

  // SuperCoin Logic
  const maxPossibleRedemption = Math.floor((totalSellingPrice - couponDiscount) * 0.2); // 20% cap
  const pointsToRedeem = usePoints ? Math.min(points, maxPossibleRedemption) : 0;

  const delivery = totalSellingPrice > 500 ? 0 : 40;
  const finalAmount = totalSellingPrice + delivery - couponDiscount - pointsToRedeem;

  const handleQuantityUpdate = async (item, newQty) => {
    if (newQty < 1) return;
    setUpdatingItems(prev => new Set(prev).add(item.id));
    try {
      await updateQuantity(item.id, newQty);
    } catch (e) {
      console.error("Failed to update qty", e);
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <div className="bg-[#f1f3f6] min-h-screen py-8">
      <div className="max-w-[1248px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start px-2 lg:px-0">

        {/* --- LEFT COLUMN: CART ITEMS --- */}
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="bg-white p-4 shadow-sm flex justify-between items-center rounded-[2px]">
            <h2 className="text-lg font-medium">My Cart ({cart.length})</h2>
            {cart.length > 0 && (
              <button
                onClick={async (e) => {
                  const btn = e.currentTarget;
                  const originalContent = btn.innerHTML;
                  btn.disabled = true;
                  btn.innerHTML = 'Generating...';
                  try {
                    const token = localStorage.getItem("userToken");
                    const payload = token ? {} : {
                      items: cart.map(i => ({
                        product_id: i.product_id || i.id,
                        quantity: i.quantity,
                        size: i.size,
                        selected_options: i.selected_options
                      }))
                    };

                    const res = await axios.post(`${API_BASE_URL}/cart/share`, payload, {
                      withCredentials: true
                    });
                    if (res.data.shareUrl) {
                      await navigator.clipboard.writeText(res.data.shareUrl);
                      toastSuccess("Shareable cart link copied to clipboard!");
                    }
                  } catch (err) {
                    console.error("Failed to share cart", err);
                    toastError(axiosErrorMessage(err) || "Failed to generate share link. Please log in first.");
                  } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalContent;
                  }
                }}
                className="flex items-center gap-2 text-brand-orange font-bold text-sm uppercase hover:bg-orange-50 px-3 py-1.5 rounded transition disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                Share Cart
              </button>
            )}
          </div>

          {/* Items List */}
          {cart.length > 0 ? (
            <div className="bg-white shadow-sm rounded-[2px] divide-y divide-gray-100">
              {cart.map((item) => {
                const isUpdating = updatingItems.has(item.id);
                const mrp = parsePrice(item.price);
                const selling = parsePrice(item.sale_price) || mrp;
                const hasDiscount = mrp > selling;

                return (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row gap-6 relative">
                    {/* Image */}
                    <div className="w-24 h-24 flex-shrink-0 mx-auto sm:mx-0">
                      <img src={`${API_BASE_URL}${item.image}`} alt={item.name} className="w-full h-full object-contain" />

                      {/* Quantity Controls */}
                      <div className="mt-4 flex items-center justify-center gap-2 relative">
                        {isUpdating && (
                          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-t-brand-orange border-gray-200 rounded-full animate-spin"></div>
                          </div>
                        )}
                        <button
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 font-medium hover:bg-gray-50 bg-white shadow-sm disabled:opacity-50"
                          disabled={item.quantity <= 1 || isUpdating}
                          onClick={() => handleQuantityUpdate(item, item.quantity - 1)}
                        >-</button>
                        <div className="w-10 h-7 border border-gray-300 flex items-center justify-center text-sm font-medium bg-white px-2 rounded-[2px]">{item.quantity}</div>
                        <button
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 font-medium hover:bg-gray-50 bg-white shadow-sm disabled:opacity-50"
                          disabled={isUpdating}
                          onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                        >+</button>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link to={generateProductUrl(item, null, null, { otracker: 'cart', otracker1: 'cart' })} className="text-[17px] font-medium text-gray-900 hover:text-brand-orange line-clamp-1">{item.name}</Link>
                          <p className="text-xs text-gray-500 mt-1">Seller: RetailNet</p>
                          {item.selected_options && (
                            <div className="mt-1 flex flex-col gap-1">
                              {Object.entries(
                                typeof item.selected_options === 'string'
                                  ? JSON.parse(item.selected_options)
                                  : item.selected_options || {}
                              ).map(([key, val]) => (
                                <p key={key} className="text-xs text-gray-500">
                                  <span className="font-semibold">{key}:</span> {val}
                                </p>
                              ))}
                            </div>
                          )}

                          {/* Customization Details */}
                          {item.customization_details && (
                            <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded-[2px]">
                              <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Personalization Details</p>
                              <div className="grid grid-cols-1 gap-1">
                                {(() => {
                                  const details = typeof item.customization_details === 'string'
                                    ? JSON.parse(item.customization_details)
                                    : item.customization_details;
                                  return Object.entries(details).filter(([_, v]) => v).map(([key, val]) => (
                                    <div key={key} className="flex items-start gap-2">
                                      <span className="text-[11px] font-bold text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                      {key === 'image' ? (
                                        <a href={`${API_BASE_URL}${val}`} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 underline">View Image</a>
                                      ) : (
                                        <span className="text-[11px] text-gray-600 italic line-clamp-2">{val}</span>
                                      )}
                                    </div>
                                  ));
                                })()}
                              </div>
                            </div>
                          )}

                          {/* PRICE DISPLAY */}
                          <div className="mb-4 mt-2">
                            <div className="flex items-end gap-3 mb-1">
                              <span className="text-xl font-bold text-gray-900">
                                {formatPrice((item.effectivePrice || selling) * item.quantity)}
                              </span>
                              {hasDiscount && (
                                <span className="text-gray-500 !line-through text-sm">
                                  {formatPrice(mrp * item.quantity)}
                                </span>
                              )}
                              {(hasDiscount || item.groupBuyDiscount > 0) && (
                                <span className="text-green-600 font-bold text-sm">
                                  {item.groupBuyDiscount > 0
                                    ? <span className="flex items-center gap-1"><span className="bg-green-100 px-1.5 py-0.5 rounded text-[10px] uppercase">Group Buy Reward</span> {Math.round(((mrp - (item.effectivePrice || selling)) / mrp) * 100)}% off</span>
                                    : `${Math.round(((mrp - selling) / mrp) * 100)}% off`
                                  }
                                </span>
                              )}
                            </div>
                            {item.groupBuyDiscount > 0 && (
                              <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                Community Goal Met! You saved {formatPrice(item.groupBuyDiscount * item.quantity)}
                              </p>
                            )}
                          </div>

                        </div>
                        <div className="text-xs text-gray-500 hidden sm:block">Delivery by Sun Nov 17 | <span className="text-green-600">Free</span> <span className="line-through">₹40</span></div>
                      </div>

                      <div className="flex items-center gap-6 pt-2 font-semibold text-[16px]">
                        <button className="text-gray-900 hover:text-brand-orange uppercase text-sm">Save For Later</button>
                        <button
                          onClick={() => confirmRemoveItem(item)}
                          className="text-gray-900 hover:text-brand-orange uppercase text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Place Order */}
              <div className="p-4 border-t border-gray-200 sticky bottom-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-10 flex justify-end">
                <button
                  onClick={() => navigate("/checkout/", {
                    state: {
                      appliedCoupon,
                      couponDiscount,
                      usePoints,
                      pointsToRedeem
                    }
                  })}
                  className="bg-brand-orange text-white font-bold py-3 px-10 text-[16px] uppercase rounded-[2px] shadow-sm hover:shadow-md transition w-full sm:w-auto"
                >
                  Place Order
                </button>
              </div>
            </div >
          ) : (
            <div className="bg-white p-8 shadow-sm rounded-[2px] text-center flex flex-col items-center">
              <img src="https://rukminim1.flixcart.com/www/800/800/promos/16/05/2019/d438a32e-765a-4d8b-b4a6-520b560971e8.png?q=90" alt="Empty Cart" className="w-56" />
              <h3 className="text-lg font-medium mt-6">Your cart is empty!</h3>
              <p className="text-gray-500 text-sm mt-2 mb-6">Explore our wide selection and find something you like</p>
              <Link to="/" className="bg-brand-orange text-white font-semibold py-2.5 px-10 text-sm rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition">
                Shop Now
              </Link>
            </div>
          )}
        </div >

        {/* --- RIGHT COLUMN: PRICE DETAILS (Hidden if empty) --- */}
        {
          cart.length > 0 && (
            <div className="space-y-4">
              {/* Coupon Section */}
              <div className="bg-white shadow-sm p-4 rounded-[2px]">
                <h3 className="text-gray-900 font-bold uppercase text-[13px] mb-3">Apply Coupon</h3>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 border-2 border-green-500 bg-green-50 square">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-bold text-green-700 text-sm mb-0">{appliedCoupon.code} - You saved {formatPrice(couponDiscount)}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-brand-orange"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim()}
                        className="px-6 py-2 bg-brand-orange text-white font-medium text-sm rounded hover:bg-brand-orange-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Apply
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-600 mt-2">{couponError}</p>
                    )}
                  </>
                )}
              </div>

              {/* SuperCoin Section */}
              {points > 0 && (
                <div className="bg-white shadow-sm p-4 rounded-[2px] border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-100 p-2 rounded-full">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="8" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Use {points} SuperCoins</p>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-tight">Save up to ₹{maxPossibleRedemption} on this order</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={usePoints}
                        onChange={(e) => setUsePoints(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Price Details */}
              <div className="bg-white shadow-sm p-4 h-fit sticky top-20 rounded-[2px]">
                <h3 className="text-gray-500 font-bold uppercase text-[15px] border-b pb-3 mb-4">Price Details</h3>
                <div className="space-y-4 text-[15px]">
                  <div className="flex justify-between">
                    <span className="text-gray-900">Price ({cart.length} items)</span>
                    <span className="text-gray-900">{formatPrice(totalMRP)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>− {formatPrice(discount)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Coupon Discount ({appliedCoupon.code})</span>
                      <span>− {formatPrice(couponDiscount)}</span>
                    </div>
                  )}
                  {usePoints && pointsToRedeem > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>SuperCoin Discount</span>
                      <span>− {formatPrice(pointsToRedeem)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-600">
                    <span>Delivery Charges</span>
                    <span>{delivery === 0 ? "FREE" : formatPrice(delivery)}</span>
                  </div>
                  <div className="border-t border-dashed py-4 flex justify-between font-bold text-lg">
                    <span>Total Amount</span>
                    <span>{formatPrice(finalAmount)}</span>
                  </div>
                </div>
                <p className="text-green-600 text-xs font-bold mt-3">
                  You will save {formatPrice(discount + couponDiscount + pointsToRedeem)} on this order
                </p>

                <div className="mt-8 flex items-center gap-3 text-xs text-gray-500">
                  <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/shield_b33d0c.svg" alt="Secure" className="h-8 opacity-70" />
                  <p className="leading-tight">Safe and Secure Payments. Easy returns.<br />100% Authentic products.</p>
                </div>
              </div>
            </div>
          )
        }

      </div >
      <RemoveItemModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onConfirm={handleFinalRemove}
        itemName={itemToRemove?.name}
      />
    </div >
  );
};

export default CartPage;
