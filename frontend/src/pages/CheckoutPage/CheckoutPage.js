import { formatPrice, parsePrice } from "../../utils/format";
import React, { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import useCart from "../../hooks/useCart";
import axios from "axios";
import { toastSuccess, toastError } from "../../utils/toast";
import { Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import ScratchCard from "../../components/Gamification/ScratchCard";
import RemoveItemModal from "../../components/RemoveItemModal";
import { encryptId } from "../../utils/secureId";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const stripePromise = loadStripe("pk_test_51S7GZlJvCIY9aPOK467vtASyt30CtaOJJpIj30Gwwssn0EqqhfXVnjUbIFlmpMYTIMgBjgTFjtAkkOsbSn8XV3rI00uAjFMyNW");

// --- Helper Components ---

const StepHeader = ({ step, currentStep, title, subtitle, isDone, onEdit }) => {
  const isActive = step === currentStep;
  return (
    <div className={`p-4 ${isActive ? "bg-brand-orange text-white" : "bg-white"} flex justify-between items-center rounded-sm shadow-sm h-[52px]`}>
      <div className="flex items-center gap-4">
        <span className={`flex items-center justify-center w-6 h-6 text-[11px] font-semibold rounded-[2px] ${isActive ? "bg-white text-brand-orange" : "bg-gray-100 text-brand-orange"}`}>
          {step}
        </span>
        <div className="flex flex-col">
          <span className={`font-semibold uppercase text-sm tracking-wide ${isActive ? "text-white" : "text-[#878787]"}`}>{title}</span>
          {subtitle && !isActive && <span className="text-[13px] text-black font-semibold mt-0.5">{subtitle}</span>}
        </div>
      </div>
      {(isDone || (isActive && step === 1 && subtitle)) && (
        <button onClick={onEdit} className="text-brand-orange bg-white border border-gray-200 px-6 py-2 text-xs font-bold rounded-[2px] uppercase shadow-sm hover:shadow-md transition">
          Change
        </button>
      )}
    </div>
  );
};

// --- Main Page ---

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart, clearCart, updateQuantity, removeFromCart } = useCart();
  const { user, loginUser } = useAuth();
  const [activeStep, setActiveStep] = useState(1); // Start at Login step

  // Handle return from CompletePaymentPage
  useEffect(() => {
    if (location.state?.returnToStep) {
      setActiveStep(location.state.returnToStep);

      // Preserve state when returning
      if (location.state.appliedCoupon !== undefined) setAppliedCoupon(location.state.appliedCoupon);
      if (location.state.couponDiscount !== undefined) setCouponDiscount(location.state.couponDiscount);
      if (location.state.usePoints !== undefined) setUsePoints(location.state.usePoints);

      // Clean up step state
      navigate(location.pathname, { replace: true, state: { ...location.state, returnToStep: undefined } });
    }
  }, [location.state, location.pathname, navigate]);

  // Get coupon from navigation state
  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || null);
  const [couponDiscount, setCouponDiscount] = useState(location.state?.couponDiscount || 0);

  // SuperCoin State
  const [usePoints, setUsePoints] = useState(location.state?.usePoints || false);
  const [points, setPoints] = useState(0);

  // Address State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: "",
    phone: "",
    pincode: "",
    locality: "",
    flat_house: "",
    address: "",
    city: "",
    state: "",
    landmark: "",
    alternate_phone: "",
    type: "Home"
  });

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState("CARD"); // 'CARD' or 'COD'

  // Inline Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStep, setLoginStep] = useState(1); // 1 = email, 2 = password
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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

  // Handle inline login
  const handleInlineLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    if (loginStep === 1) {
      // Step 1: Validate email and proceed to password
      if (!loginEmail.trim()) {
        setLoginError('Please enter email or mobile number');
        return;
      }
      setLoginStep(2);
      return;
    }

    // Step 2: Actual login
    if (!loginPassword.trim()) {
      setLoginError('Please enter password');
      return;
    }

    setLoginLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        email: loginEmail,
        password: loginPassword
      }, { withCredentials: true });

      loginUser(response.data.user);
      setActiveStep(2); // Move to address step
      toastSuccess('Logged in successfully!');
      // fetchAddresses handled by useEffect on user change
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    }
    setLoginLoading(false);
  };

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');

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
        const coupon = res.data.coupon;
        // Calculate discount immediately for Checkout Page state
        let discountAmount = 0;
        if (coupon.discount_type === 'flat') {
          discountAmount = coupon.discount_value;
        } else {
          const percentDiscount = (totalSellingPrice * coupon.discount_value) / 100;
          discountAmount = coupon.max_discount_value ? Math.min(percentDiscount, coupon.max_discount_value) : percentDiscount;
        }

        setAppliedCoupon(coupon);
        setCouponDiscount(discountAmount);
        setCouponCode('');
        toastSuccess('Coupon applied successfully!');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon code");
      setAppliedCoupon(null);
      setCouponDiscount(0);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  };

  const totalMRP = cart.reduce((sum, item) => sum + (parsePrice(item.price) || parsePrice(item.sale_price)) * item.quantity, 0);
  const totalGBReward = cart.reduce((sum, item) => {
    if (item.gb_status === 'completed' && item.gb_discount_percentage) {
      const sp = parsePrice(item.sale_price);
      return sum + Math.round((sp * item.gb_discount_percentage) / 100) * item.quantity;
    }
    return sum;
  }, 0);
  const totalSellingPrice = cart.reduce((sum, item) => sum + (item.effectivePrice || parsePrice(item.sale_price) || parsePrice(item.price)) * item.quantity, 0);
  const totalRegularDiscount = Math.max(0, totalMRP - totalSellingPrice - totalGBReward);
  const delivery = totalSellingPrice > 500 ? 0 : 40;

  // Recalculate SuperCoin discount based on current totals
  const maxPossibleRedemption = Math.floor((totalSellingPrice - couponDiscount) * 0.2);
  const currentPointsToRedeem = usePoints ? Math.min(points, maxPossibleRedemption) : 0;

  const finalAmount = totalSellingPrice + delivery - couponDiscount - currentPointsToRedeem;
  const [locationLoading, setLocationLoading] = useState(false);

  // Handle "Use my current location" button
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Using free reverse geocoding API (OpenStreetMap Nominatim)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();

          if (data && data.address) {
            const addr = data.address;
            setNewAddress(prev => ({
              ...prev,
              address: [addr.road, addr.neighbourhood, addr.suburb].filter(Boolean).join(", ") || "",
              locality: addr.village || addr.town || addr.city_district || "",
              city: addr.city || addr.town || addr.county || "",
              state: addr.state || "",
              pincode: addr.postcode || "",
            }));
            toastSuccess("Location fetched successfully!");
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          alert("Failed to fetch address. Please enter manually.");
        }
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert("Location access denied. Please enable location in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            alert("Location request timed out.");
            break;
          default:
            alert("An unknown error occurred.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };


  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!user) return;
      // Map UI fields to Backend Schema
      // Backend expects: full_name, mobile, alternate_mobile, flat_house, address_line1, city, state, zip_code
      const payload = {
        full_name: newAddress.name,
        mobile: newAddress.phone,
        alternate_mobile: newAddress.alternate_phone,
        flat_house: newAddress.flat_house,
        address_line1: `${newAddress.address}${newAddress.locality ? `, ${newAddress.locality}` : ''}`, // Combine for line1 if needed, or keeping simple
        // Actually, let's keep line1 just as address. Locality can be appended or ignored if not in schema.
        // Let's map Address -> Line 1. Locality -> part of Line 1 or Line 2 if it existed.
        // New Schema doesn't have address_line2. So append Locality to Line 1 or Flat/House?
        // Let's append Locality to Address Line 1.

        // Re-mapping based on exact backend keys:
        city: newAddress.city,
        state: newAddress.state,
        zip_code: newAddress.pincode,
        country: "India",
        type: newAddress.type,
        is_default: false
      };

      // We also need to send the legacy/other fields if the UI has them separate, but backend combines them.
      // Wait, I updated users.js to require flat_house.
      if (!newAddress.flat_house) {
        toastError("Flat/House details are required");
        return;
      }

      const res = await axios.post(`${API_BASE_URL}/users/addresses`, payload, {
        withCredentials: true
      });

      toastSuccess("Address added successfully");
      setAddresses([...addresses, { ...payload, id: res.data.id }]);
      setSelectedAddress({ ...payload, id: res.data.id });
      setShowAddressForm(false);
    } catch (err) {
      toastError("Failed to add address");
    }
  };

  const fetchPoints = useCallback(async () => {
    try {
      if (!user) return;
      const res = await axios.get(`${API_BASE_URL}/users/me/supercoins`, {
        withCredentials: true
      });
      setPoints(res.data.balance || 0);
    } catch (err) {
      console.error("Failed to fetch points", err);
    }
  }, [user]);

  const fetchAddresses = useCallback(async () => {
    try {
      if (!user) return;
      const res = await axios.get(`${API_BASE_URL}/users/addresses`, {
        withCredentials: true
      });
      setAddresses(res.data);
      if (res.data.length > 0) setSelectedAddress(res.data[0]);
      else setShowAddressForm(true);
    } catch (err) {
      console.error("Failed to fetch addresses");
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAddresses();
      fetchPoints();
    }
  }, [user, fetchAddresses, fetchPoints]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.length === 0) {
      navigate("/cart");
    }
  }, [cart, navigate]);

  return (
    <div className="bg-[#f1f3f6] min-h-screen py-8">
      <div className="max-w-[1248px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start px-2 lg:px-0">

        {/* --- LEFT COLUMN: STEPS --- */}
        <div className="flex flex-col gap-4">

          {/* STEP 1: LOGIN */}
          <div className="bg-white shadow-sm">
            <StepHeader
              step={1} currentStep={activeStep}
              title={user ? "Login" : "Login Or Signup"}
              subtitle={user ? `${user.email || ''}${user.phone ? ` - +91 ${user.phone}` : ''}` : null}
              isDone={!!user}
              onEdit={() => setActiveStep(1)}
            />
            {activeStep === 1 && (
              <div className="p-6">
                {user ? (
                  // Logged in user view
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      <div className="flex flex-col gap-4">
                        <div className="flex text-sm">
                          <span className="text-gray-500 w-24">Name</span>
                          <span className="text-gray-900 font-bold ml-4">{user.name}</span>
                        </div>
                        <div className="flex text-sm">
                          <span className="text-gray-500 w-24">Email</span>
                          <span className="text-gray-900 font-bold ml-4">{user.email}</span>
                        </div>
                        <div className="mt-2">
                          <button
                            onClick={() => {
                              localStorage.removeItem('user');
                              localStorage.removeItem('userToken');
                              window.location.href = '/';
                            }}
                            className="text-brand-orange text-[14px] font-semibold hover:underline"
                          >
                            Logout & Sign in to another account
                          </button>
                        </div>
                        <div className="mt-4">
                          <button onClick={() => setActiveStep(2)} className="bg-brand-orange text-white font-bold py-4 px-16 text-[15px] uppercase rounded-[2px] shadow-sm hover:shadow-md transition tracking-wide">
                            Continue Checkout
                          </button>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-2 leading-relaxed">
                          Please note that upon clicking "Logout" you will lose all items in cart and will be redirected to home page.
                        </p>
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col w-[400px] border-l border-gray-100 pl-8">
                      <p className="text-gray-400 text-sm mb-6 font-medium">Advantages of our secure login</p>
                      <div className="space-y-5">
                        <div className="flex items-center gap-4">
                          <div className="text-xl">📦</div>
                          <span className="text-gray-700 text-[13px] font-medium leading-tight">Easily Track Orders, Hassle free Returns</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-xl">🔔</div>
                          <span className="text-gray-700 text-[13px] font-medium leading-tight">Get Relevant Alerts and Recommendation</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-xl">⭐</div>
                          <span className="text-gray-700 text-[13px] font-medium leading-tight">Wishlist, Reviews, Ratings and more.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Not logged in - show inline login form
                  <form onSubmit={handleInlineLogin} className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                      {loginStep === 1 ? (
                        // Step 1: Email/Phone input
                        <div className="mb-4">
                          <input
                            type="text"
                            value={loginEmail}
                            onChange={(e) => { setLoginEmail(e.target.value); setLoginError(''); }}
                            placeholder="Enter Email/Mobile number"
                            className="w-full max-w-md p-3 border-b-2 border-gray-300 focus:border-brand-orange outline-none text-gray-700"
                          />
                        </div>
                      ) : (
                        // Step 2: Password input
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-gray-700 font-medium">{loginEmail}</span>
                            <button
                              type="button"
                              onClick={() => { setLoginStep(1); setLoginPassword(''); setLoginError(''); }}
                              className="text-brand-orange text-sm hover:underline"
                            >
                              Change
                            </button>
                          </div>
                          <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                            placeholder="Enter Password"
                            className="w-full max-w-md p-3 border-b-2 border-gray-300 focus:border-brand-orange outline-none text-gray-700"
                            autoFocus
                          />
                        </div>
                      )}

                      {loginError && (
                        <p className="text-red-600 text-xs mb-4">{loginError}</p>
                      )}

                      <p className="text-gray-500 text-xs mb-6">
                        By continuing, you agree to our{' '}
                        <a href="/terms" className="text-brand-orange hover:underline">Terms of Use</a> and{' '}
                        <a href="/privacy" className="text-brand-orange hover:underline">Privacy Policy</a>.
                      </p>
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="bg-brand-orange text-white font-bold py-3.5 px-16 text-sm uppercase rounded-[2px] shadow-sm hover:shadow-md transition disabled:opacity-70"
                      >
                        {loginLoading ? 'Please wait...' : 'Continue'}
                      </button>

                      {loginStep === 2 && (
                        <p className="text-gray-500 text-xs mt-4">
                          New user? <a href="/register" className="text-brand-orange hover:underline">Create an account</a>
                        </p>
                      )}
                    </div>
                    <div className="flex-1 border-l border-gray-200 pl-8 hidden md:block">
                      <p className="text-[#878787] text-sm mb-4">Advantages of our secure login</p>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-blue-600">📦</span>
                          <span className="text-gray-700">Easily Track Orders, Hassle free Returns</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-yellow-500">🔔</span>
                          <span className="text-gray-700">Get Relevant Alerts and Recommendation</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-yellow-500">⭐</span>
                          <span className="text-gray-700">Wishlist, Reviews, Ratings and more.</span>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>


          {/* STEP 2: DELIVERY ADDRESS */}
          <div className={`bg-white shadow-sm ${!user ? 'opacity-60 pointer-events-none' : ''}`}>
            <StepHeader
              step={2} currentStep={activeStep}
              title="Delivery Address"
              subtitle={selectedAddress ? `${selectedAddress.flat_house ? `${selectedAddress.flat_house}, ` : ''}${selectedAddress.address_line1}, ${selectedAddress.city} - ${selectedAddress.zip_code}` : null}
              isDone={activeStep > 2}
              onEdit={() => user && setActiveStep(2)}
            />
            {activeStep === 2 && user && (
              <div className="p-4 pl-4 md:pl-12 -mt-4 pb-6">
                {/* List Saved Addresses */}
                {addresses.map(addr => (
                  <div key={addr.id} className={`flex items-start gap-4 p-4 border-b border-gray-100 ${selectedAddress?.id === addr.id ? "bg-[#f5faff]" : ""}`}>
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress?.id === addr.id}
                      onChange={() => setSelectedAddress(addr)}
                      className="mt-1 w-4 h-4 text-brand-orange accent-brand-orange"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-sm">{addr.full_name || user?.name || "User"}</span>
                        <span className="bg-gray-100 text-gray-500 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-[2px]">{addr.type || 'HOME'}</span>
                        <span className="font-semibold text-sm ml-2">{addr.mobile || user?.phone || '9876543210'}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {addr.flat_house && `${addr.flat_house}, `}
                        {addr.address_line1}, {addr.address_line2 && `${addr.address_line2}, `} {addr.city} - <span className="font-semibold">{addr.zip_code}</span>, {addr.state}
                      </p>
                      {selectedAddress?.id === addr.id && (
                        <button
                          onClick={() => setActiveStep(3)}
                          className="mt-4 bg-brand-orange text-white font-bold py-3 px-8 text-sm uppercase rounded-[2px] shadow-sm hover:shadow-md transition">
                          Deliver Here
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add New Address Header */}
                <div
                  className="p-4 cursor-pointer text-brand-orange font-semibold text-sm flex items-center gap-2 mt-2"
                  onClick={() => setShowAddressForm(!showAddressForm)}
                >
                  <Plus size={16} /> <span>ADD A NEW ADDRESS</span>
                </div>

                {/* Add New Address Form */}
                {showAddressForm && (
                  <form onSubmit={handleAddressSubmit} className="bg-[#f5faff] p-4 m-4 mt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={locationLoading}
                      className="col-span-1 md:col-span-2 bg-brand-orange text-white font-semibold py-2 px-4 text-sm rounded-[2px] self-start w-fit flex items-center gap-2 shadow-sm mb-2 hover:bg-brand-orange-hover transition disabled:opacity-70"
                    >
                      {locationLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Fetching location...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><g fill="none" fillRule="evenodd"><path d="M0 0h16v16H0z"></path><path fill="#fff" d="M8 5.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 1 0 0-5.4zm6 2A6 6 0 0 0 8.7 2V.7H7.3V2A6 6 0 0 0 2 7.3H.7v1.4H2A6 6 0 0 0 7.3 14v1.3h1.4V14A6 6 0 0 0 14 8.7h1.3V7.3H14zm-6 5.4A4.7 4.7 0 0 1 3.3 8 4.7 4.7 0 0 1 8 3.3 4.7 4.7 0 0 1 12.7 8 4.7 4.7 0 0 1 8 12.7z"></path></g></svg>
                          Use my current location
                        </>
                      )}
                    </button>


                    {/* Floating Labels Inputs */}
                    <div className="col-span-1">
                      <input type="text" placeholder="Name" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none" required
                        value={newAddress.name} onChange={e => setNewAddress({ ...newAddress, name: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="10-digit mobile number" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none" required
                        value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="Pincode" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none" required
                        value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="Locality" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none" required
                        value={newAddress.locality} onChange={e => setNewAddress({ ...newAddress, locality: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="Flat / House / Building" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none" required
                        value={newAddress.flat_house} onChange={e => setNewAddress({ ...newAddress, flat_house: e.target.value })} />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <textarea rows="3" placeholder="Address (Area and Street)" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none resize-none" required
                        value={newAddress.address} onChange={e => setNewAddress({ ...newAddress, address: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="City/District/Town" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none" required
                        value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <select className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none bg-white text-gray-600"
                        value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}>
                        <option value="">--Select State--</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Maharashtra">Maharashtra</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="Landmark (Optional)" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none"
                        value={newAddress.landmark} onChange={e => setNewAddress({ ...newAddress, landmark: e.target.value })} />
                    </div>
                    <div className="col-span-1">
                      <input type="text" placeholder="Alternate Phone (Optional)" className="w-full p-3 border border-gray-300 rounded-[2px] text-sm focus:border-brand-orange outline-none"
                        value={newAddress.alternate_phone} onChange={e => setNewAddress({ ...newAddress, alternate_phone: e.target.value })} />
                    </div>

                    <div className="col-span-1 md:col-span-2 mt-2">
                      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide mb-2">Address Type</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="radio" name="type" className="w-4 h-4 text-brand-orange accent-brand-orange" defaultChecked /> Home (All day delivery)
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="radio" name="type" className="w-4 h-4 text-brand-orange accent-brand-orange" /> Work (Delivery between 10 AM - 5 PM)
                        </label>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 mt-4 flex gap-4">
                      <button type="submit" className="bg-brand-orange text-white font-bold py-3 px-10 text-sm uppercase rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition">
                        Save And Deliver Here
                      </button>
                      <button type="button" onClick={() => setShowAddressForm(false)} className="text-brand-orange font-bold text-sm uppercase px-4 hover:bg-gray-50 rounded-[2px]">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: ORDER SUMMARY */}
          <div className={`bg-white shadow-sm ${!user ? 'opacity-60 pointer-events-none' : ''}`}>
            <StepHeader
              step={3} currentStep={activeStep}
              title="Order Summary"
              subtitle={activeStep > 3 ? `${cart.length} Items` : null}
              isDone={activeStep > 3}
              onEdit={() => user && setActiveStep(3)}
            />
            {activeStep === 3 && user && (
              <div className="p-4 pl-4 md:pl-12 -mt-4 pb-6">
                {cart.map((item) => {
                  const mrp = parsePrice(item.price);
                  const selling = parsePrice(item.sale_price) || mrp;
                  const hasDiscount = mrp > selling;

                  return (
                    <div key={item.id} className="flex gap-4 border-b border-gray-100 py-4 last:border-0">
                      <div className="w-24 h-24 flex-shrink-0">
                        <img src={`${API_BASE_URL}${item.image}`} alt={item.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">Seller: RetailNet</span>
                          {item.size && <span className="text-xs text-gray-500 font-medium bg-gray-100 px-1 rounded-sm">Size: {item.size}</span>}
                          <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/fa_62673a.png" alt="Assured" className="h-4" />
                        </div>

                        {/* Customization Details */}
                        {item.customization_details && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-100 rounded-[2px] max-w-md">
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
                                      <span className="text-[11px] text-gray-600 italic line-clamp-1">{val}</span>
                                    )}
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
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
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm font-semibold text-gray-700">Qty:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center hover:border-brand-orange hover:bg-orange-50 transition-all"
                            disabled={item.quantity <= 1}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 border border-gray-300 rounded-full flex items-center justify-center hover:border-brand-orange hover:bg-orange-50 transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                          </button>
                        </div>
                        <button
                          onClick={() => confirmRemoveItem(item)}
                          className="text-[#212121] hover:text-brand-orange font-bold text-xs uppercase transition-colors ml-4"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}

                <RemoveItemModal
                  isOpen={showRemoveModal}
                  onClose={() => setShowRemoveModal(false)}
                  onConfirm={handleFinalRemove}
                  itemName={itemToRemove?.name}
                />

                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between items-center bg-white p-2">
                    <span className="text-sm text-gray-800">Order Confirmation email will be sent to <span className="font-semibold">{user?.email}</span></span>
                    <button
                      onClick={() => {
                        const userToken = ""; // Cookies used now
                        const userId = user?.id || "guest";
                        const tempOrderId = `TEMP_${Date.now()}`;
                        const rawToken = `${userToken}:${userId}:${tempOrderId}`;
                        const dynamicToken = `PN${encryptId(rawToken)}`;

                        navigate(`/complete-payments/?token=${dynamicToken}`, {
                          state: {
                            cart,
                            finalAmount,
                            totalMRP,
                            totalRegularDiscount,
                            totalGBReward,
                            appliedCoupon,
                            couponDiscount,
                            usePoints,
                            currentPointsToRedeem,
                            selectedAddress,
                            user
                          }
                        });
                      }}
                      className="bg-brand-orange text-white font-bold py-3 px-12 text-sm uppercase rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: PAYMENT OPTIONS */}
          <div className="bg-white shadow-sm mb-12">
            <StepHeader
              step={4} currentStep={activeStep}
              title="Payment Options"
              isDone={false}
            />
            {activeStep === 4 && (
              <div className="p-4 pl-4 md:pl-12 -mt-4 pb-6">
                <div className="mb-4">
                  <label className="flex items-center gap-4 cursor-pointer p-4 border-b border-gray-100 bg-[#f5faff]">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "CARD"}
                      className="w-4 h-4 text-brand-orange accent-brand-orange"
                      onChange={() => setPaymentMethod("CARD")}
                    />
                    <span className="flex-1 text-sm font-medium">Credit / Debit / ATM Card</span>
                  </label>
                  <label className="flex items-center gap-4 cursor-pointer p-4 border-b border-gray-100 bg-[#f5faff]">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "COD"}
                      className="w-4 h-4 text-brand-orange accent-brand-orange"
                      onChange={() => setPaymentMethod("COD")}
                    />
                    <span className="flex-1 text-sm font-medium">Cash on Delivery (COD)</span>
                  </label>

                  <div className="p-6 bg-[#f5faff]">
                    <Elements stripe={stripePromise}>
                      <CheckoutFormInternal
                        cart={cart}
                        clearCart={clearCart}
                        total={finalAmount}
                        paymentMethod={paymentMethod}
                        selectedAddress={selectedAddress}
                        appliedCoupon={appliedCoupon}
                        couponDiscount={couponDiscount}
                        redeemed_points={currentPointsToRedeem}
                      />
                    </Elements>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* --- RIGHT COLUMN: COUPON & PRICE DETAILS --- */}
        <div className="space-y-4 lg:sticky lg:top-8">
          {/* Coupon Section */}
          <div className="bg-white shadow-sm p-4 rounded-[2px]">
            <h3 className="text-gray-500 font-bold uppercase text-[13px] mb-3">Apply Coupon</h3>

            {appliedCoupon ? (
              <div className="flex items-center justify-between p-2 border-2 border-green-500 bg-green-50 square">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-bold text-green-700 text-sm mb-0">{appliedCoupon.code} - You save {formatPrice(couponDiscount)}</p>
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
              <h3 className="text-gray-500 font-bold uppercase text-[13px] mb-3">SuperCoin Redemption</h3>
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
              {totalRegularDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Regular Discount</span>
                  <span>− {formatPrice(totalRegularDiscount)}</span>
                </div>
              )}
              {totalGBReward > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Group Buy Reward</span>
                  <span>− {formatPrice(totalGBReward)}</span>
                </div>
              )}
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>− {formatPrice(couponDiscount)}</span>
                </div>
              )}
              {usePoints && currentPointsToRedeem > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>SuperCoin Discount</span>
                  <span>− {formatPrice(currentPointsToRedeem)}</span>
                </div>
              )}
              <div className="flex justify-between text-green-600">
                <span>Delivery Charges</span>
                <span>{delivery === 0 ? "FREE" : formatPrice(delivery)}</span>
              </div>
              <div className="border-t border-dashed py-4 flex justify-between font-bold text-lg">
                <span>Total Payable</span>
                <span>{formatPrice(finalAmount)}</span>
              </div>
            </div>
            <p className="text-green-600 text-xs font-bold mt-3">You will save {formatPrice(totalRegularDiscount + totalGBReward + couponDiscount + currentPointsToRedeem)} on this order</p>

            <div className="mt-8 flex items-center gap-3 text-xs text-gray-500">
              <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/shield_b33d0c.svg" alt="Secure" className="h-8 opacity-70" />
              <p className="leading-tight">Safe and Secure Payments. Easy returns.<br />100% Authentic products.</p>
            </div>
          </div>
        </div>

      </div>
    </div >
  );
};

// Internal Sub-component for Payment Logic
const CheckoutFormInternal = ({ cart, clearCart, total, paymentMethod, selectedAddress, appliedCoupon, couponDiscount, redeemed_points }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rewardData, setRewardData] = useState(null);

  const fetchReward = async (orderId) => {
    try {
      const rewardsRes = await axios.get(`${API_BASE_URL}/users/me/rewards`, {
        withCredentials: true
      });
      const currentReward = rewardsRes.data.rewards.find(r => r.order_id === orderId);
      if (currentReward) {
        setRewardData(currentReward);
      } else {
        window.location.href = "/account/orders";
      }
    } catch (err) {
      window.location.href = "/account/orders";
    }
  };

  const handleCODStats = async () => {
    setLoading(true);
    setError("");
    try {
      const paymentId = `COD_${Date.now()}`;
      const shippingAddress = selectedAddress ? JSON.stringify(selectedAddress) : "No address selected";

      const orderRes = await fetch(`${API_BASE_URL}/orders/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          products: cart,
          total,
          paymentId,
          shipping_address: shippingAddress,
          coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount || 0,
          redeemed_points: redeemed_points || 0,
        }),
      });
      const orderDataJson = await orderRes.json();
      const orderId = orderDataJson.orderId;

      toastSuccess("Order placed successfully!");
      // Track Purchase
      import('../../utils/analytics').then(({ trackEvent }) => {
        trackEvent('purchase', {
          order_id: orderId,
          total: total,
          revenue: total,
          products: cart.map(i => ({ id: i.id || i.product_id, quantity: i.quantity, price: i.price }))
        });
      });
      clearCart();
      await fetchReward(orderId);
    } catch (err) {
      console.error(err);
      setError("Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/payment/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total * 100 }),
      });
      const { clientSecret } = await res.json();

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setError(result.error.message);
      } else if (result.paymentIntent.status === "succeeded") {
        const shippingAddress = selectedAddress ? JSON.stringify(selectedAddress) : "No address selected";

        const orderRes = await fetch(`${API_BASE_URL}/orders/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            products: cart,
            total,
            paymentId: result.paymentIntent.id,
            shipping_address: shippingAddress,
            coupon_code: appliedCoupon?.code || null,
            coupon_discount: couponDiscount || 0,
            redeemed_points: redeemed_points || 0,
          }),
        });

        const orderDataJson = await orderRes.json();
        const orderId = orderDataJson.orderId;

        toastSuccess("Order placed successfully!");
        // Track Purchase
        import('../../utils/analytics').then(({ trackEvent }) => {
          trackEvent('purchase', {
            order_id: orderId,
            total: total,
            revenue: total,
            products: cart.map(i => ({ id: i.id || i.product_id, quantity: i.quantity, price: i.price }))
          });
        });
        clearCart();
        await fetchReward(orderId);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong with payment.");
    } finally {
      setLoading(false);
    }
  };

  if (rewardData) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in duration-300">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-gray-900 mb-2">🎉 Order Confirmed!</h2>
            <p className="text-gray-500 font-medium">You've earned a special reward. Scratch the card below to reveal your SuperCoins!</p>
          </div>

          <div className="flex justify-center mb-8">
            <ScratchCard
              amount={rewardData.reward_value}
              onComplete={async () => {
                try {
                  await axios.post(`${API_BASE_URL}/users/me/rewards/${rewardData.id}/scratch`, {}, {
                    withCredentials: true
                  });
                  setTimeout(() => {
                    window.location.href = "/account/supercoins";
                  }, 2000);
                } catch (err) {
                  setTimeout(() => {
                    window.location.href = "/account/orders";
                  }, 2000);
                }
              }}
            />
          </div>

          <button
            onClick={() => window.location.href = "/account/orders"}
            className="text-gray-400 text-sm font-bold hover:text-gray-600 transition"
          >
            Skip & View Orders
          </button>
        </div>
      </div>
    );
  }

  if (paymentMethod === "COD") {
    return (
      <div className="max-w-[400px]">
        {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
        <button
          onClick={handleCODStats}
          disabled={loading}
          className="w-full bg-brand-orange text-white font-bold py-3 text-sm uppercase rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition"
        >
          {loading ? "Placing Order..." : `CONFIRM COD ORDER: ${formatPrice(total)}`}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleStripeSubmit} className="max-w-[400px]">
      {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
      <div className="mb-4 bg-white p-3 border border-gray-200 rounded">
        <CardElement options={{ hidePostalCode: true }} />
      </div>
      <button
        disabled={!stripe || loading}
        className="w-full bg-brand-orange text-white font-bold py-3 text-sm uppercase rounded-[2px] shadow-sm hover:bg-brand-orange-hover transition"
      >
        {loading ? "Processing..." : `PAY ${formatPrice(total)}`}
      </button>
    </form>
  );
};

export default CheckoutPage;
