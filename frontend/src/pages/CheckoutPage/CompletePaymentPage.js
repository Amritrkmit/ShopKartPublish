import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import axios from 'axios';
import { toastSuccess, toastError } from '../../utils/toast';

import ScratchCard from '../../components/Gamification/ScratchCard';

const stripePromise = loadStripe("pk_test_51O7QshSDAaN37x8hV7n9s3b2j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z");
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const CompletePaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { cart, selectedAddress } = location.state || {};

    const [selectedMethod, setSelectedMethod] = useState('UPI');
    const [isMRPVisible, setIsMRPVisible] = useState(true);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon || null);
    const [couponDiscount, setCouponDiscount] = useState(location.state?.couponDiscount || 0);

    // SuperCoin State
    const [usePoints, setUsePoints] = useState(location.state?.usePoints || false);
    const [points, setPoints] = useState(0);

    // Redirect if no state (direct access)
    useEffect(() => {
        if (!cart) {
            navigate('/checkout/');
        }
    }, [cart, navigate]);

    useEffect(() => {
        fetchPoints();
    }, []);

    const fetchPoints = async () => {
        try {
            // Updated to use cookie-based auth
            const res = await axios.get(`${API_BASE_URL}/users/me/supercoins`, {
                withCredentials: true
            });
            setPoints(res.data.balance || 0);
        } catch (err) {
            console.error("Failed to fetch points", err);
        }
    };

    const parsePrice = (price) => {
        if (typeof price === 'number') return price;
        if (!price) return 0;
        return parseFloat(price.toString().replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
    };

    const totalMRP = cart?.reduce((sum, item) => sum + (parsePrice(item.price) || parsePrice(item.sale_price)) * item.quantity, 0) || 0;

    const totalGBReward = cart?.reduce((sum, item) => {
        if (item.gb_status === 'completed' && item.gb_discount_percentage) {
            const sp = parsePrice(item.sale_price);
            return sum + Math.round((sp * item.gb_discount_percentage) / 100) * item.quantity;
        }
        return sum;
    }, 0) || 0;

    const totalSellingPrice = cart?.reduce((sum, item) => sum + (item.effectivePrice || parsePrice(item.sale_price) || parsePrice(item.price)) * item.quantity, 0) || 0;

    const totalRegularDiscount = Math.max(0, totalMRP - totalSellingPrice - totalGBReward);
    const delivery = totalSellingPrice > 500 ? 0 : 40;

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

    const maxPossibleRedemption = Math.floor((totalSellingPrice - couponDiscount) * 0.2);
    const currentPointsToRedeem = usePoints ? Math.min(points, maxPossibleRedemption) : 0;

    const finalAmount = totalSellingPrice + delivery - couponDiscount - currentPointsToRedeem;

    const [loading, setLoading] = useState(false);
    const [rewardData, setRewardData] = useState(null);

    const fetchReward = async (orderId) => {
        try {
            // Updated to use cookie-based auth
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

    const handleOrderCreation = async (paymentId) => {
        setLoading(true);
        try {
            const shippingAddress = selectedAddress ? JSON.stringify(selectedAddress) : "No address selected";
            const orderRes = await axios.post(`${API_BASE_URL}/orders/create`, {
                products: cart,
                total: finalAmount,
                paymentId,
                shipping_address: shippingAddress,
                coupon_code: appliedCoupon?.code || null,
                coupon_discount: couponDiscount || 0,
                redeemed_points: currentPointsToRedeem || 0,
            }, {
                withCredentials: true
            });

            const orderId = orderRes.data.orderId;
            toastSuccess("Order placed successfully!");

            // Track Purchase
            import('../../utils/analytics').then(({ trackEvent }) => {
                trackEvent('purchase', {
                    order_id: orderId,
                    total: finalAmount,
                    revenue: finalAmount,
                    products: cart.map(i => ({ id: i.id || i.product_id, quantity: i.quantity, price: i.price }))
                });
            });

            await fetchReward(orderId);
        } catch (err) {
            console.error(err);
            toastError("Failed to place order");
        } finally {
            setLoading(false);
        }
    };

    const handleCODOrder = () => {
        handleOrderCreation(`COD_${Date.now()}`);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(price || 0);
    };

    const handleBackNavigation = () => {
        navigate('/checkout/', {
            state: {
                returnToStep: 2,
                appliedCoupon,
                couponDiscount,
                usePoints,
                pointsToRedeem: currentPointsToRedeem
            }
        });
    };

    const paymentMethods = [
        { id: 'SAVED', title: 'Saved Payment Options', icon: '🕒', description: '' },
        { id: 'UPI', title: 'UPI', icon: 'UPI', description: 'Pay by any UPI app', offer: 'Get upto ₹20 cashback • 4 offers available' },
        { id: 'CARD', title: 'Credit / Debit / ATM Card', icon: '💳', description: 'Add and secure cards as per RBI guidelines', offer: 'Get upto 5% cashback • 2 offers available' },
        { id: 'COD', title: 'Cash on Delivery', icon: '💵', description: '' },
        { id: 'GIFT', title: 'Have a Gift Card?', icon: '🎁', description: '' },
        { id: 'EMI_FK', title: 'Flipkart EMI', icon: '📅', description: 'Unavailable', isUnavailable: true },
        { id: 'EMI', title: 'EMI', icon: '📅', description: 'Unavailable', isUnavailable: true },
    ];

    return (
        <div className="min-h-screen bg-[#f1f3f6] pb-12">
            {/* Sticky Top Header */}
            <header className="sticky top-0 bg-white shadow-sm z-50">
                <div className="max-w-[1248px] mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={handleBackNavigation} className="p-2 hover:bg-gray-100 rounded-full transition">
                            <ChevronLeft size={24} className="text-gray-700" />
                        </button>
                        <h1 className="text-base font-bold text-gray-800">Complete Payment</h1>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[11px] uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-sm border border-gray-100">
                        <ShieldCheck size={14} className="text-gray-400" />
                        100% Secure
                    </div>
                </div>
            </header>

            <main className="max-w-[1248px] mx-auto px-4 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Column: Payment Options */}
                <div className="lg:col-span-8 flex bg-white border border-gray-200 rounded-sm overflow-hidden min-h-[500px]">
                    {/* Method Tabs */}
                    <div className="w-[300px] border-r border-gray-100 bg-[#fcfcfc]">
                        {paymentMethods.map((method) => (
                            <div
                                key={method.id}
                                onClick={() => !method.isUnavailable && setSelectedMethod(method.id)}
                                className={`p-4 cursor-pointer border-b border-gray-50 transition-all ${selectedMethod === method.id ? 'bg-white border-l-4 border-l-brand-orange shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]' : 'bg-transparent'} ${method.isUnavailable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white'}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-lg w-6 flex justify-center">{method.icon}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className={`text-sm font-semibold ${selectedMethod === method.id ? 'text-gray-900' : 'text-gray-700'}`}>{method.title}</p>
                                            {method.isUnavailable && <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">Unavailable <HelpCircle size={10} /></span>}
                                        </div>
                                        {method.description && <p className="text-[11px] text-gray-500 mt-0.5">{method.description}</p>}
                                        {method.offer && <p className="text-[11px] text-green-600 font-bold mt-1.5">{method.offer}</p>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Method Details */}
                    <div className="flex-1 p-6 bg-white">
                        {selectedMethod === 'SAVED' && (
                            <div className="space-y-4">
                                <div className="border border-gray-200 rounded p-4 flex items-center gap-4 bg-[#f5faff] border-brand-orange/30">
                                    <div className="w-5 h-5 border-4 border-brand-orange rounded-full flex items-center justify-center">
                                        <div className="w-2.5 h-2.5 bg-brand-orange rounded-full"></div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm text-gray-800">Flipkart Axis Bank Credit Card • 0693</span>
                                            <span className="bg-[#f0f0f0] text-[#707070] px-1 text-[10px] rounded italic font-black">VISA</span>
                                        </div>
                                        <p className="text-green-600 font-bold text-xs mt-1">✓ ₹27 cashback applicable*</p>
                                        <p className="text-gray-400 text-[11px] mt-1">CVV is not required for this secured card as per RBI guidelines</p>
                                        <button onClick={() => handleOrderCreation('CARD_SAVED')} className="mt-4 bg-[#fb641b] text-white font-bold py-3.5 px-12 rounded-sm shadow-md hover:bg-[#eb5e1a] transition w-full md:w-auto">
                                            Pay {formatPrice(finalAmount)}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedMethod === 'UPI' && (
                            <div className="space-y-6">
                                <p className="text-sm font-bold text-gray-800">Choose a UPI App</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button className="flex items-center gap-4 p-4 border border-gray-200 rounded-sm hover:border-brand-orange hover:bg-orange-50/30 transition text-left group">
                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border group-hover:bg-white transition">UPI</div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Google Pay</p>
                                            <p className="text-[11px] text-green-600 font-bold">Link account</p>
                                        </div>
                                    </button>
                                    <button className="flex items-center gap-4 p-4 border border-gray-200 rounded-sm hover:border-brand-orange hover:bg-orange-50/30 transition text-left group">
                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border group-hover:bg-white transition">UPI</div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">PhonePe</p>
                                            <p className="text-[11px] text-green-600 font-bold">Link account</p>
                                        </div>
                                    </button>
                                </div>
                                <div className="pt-4 border-t border-gray-50">
                                    <p className="text-sm font-bold text-gray-800 mb-4">Enter UPI ID</p>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="example@upi" className="flex-1 px-4 py-3 border border-gray-200 rounded-sm focus:outline-none focus:border-brand-orange text-sm" />
                                        <button className="bg-brand-orange text-white font-bold py-3 px-8 rounded-sm shadow-sm hover:bg-[#eb5e1a] transition uppercase text-xs">Verify</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedMethod === 'CARD' && (
                            <div className="max-w-md mx-auto py-8">
                                <Elements stripe={stripePromise}>
                                    <PaymentForm
                                        amount={finalAmount}
                                        onSuccess={handleOrderCreation}
                                        loading={loading}
                                        setLoading={setLoading}
                                    />
                                </Elements>
                            </div>
                        )}

                        {selectedMethod === 'COD' && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                    <span className="text-2xl text-green-600">💵</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Cash on Delivery</h3>
                                <p className="text-sm text-gray-500 max-w-xs mb-8">Pay with cash when your items are delivered to your doorstep.</p>
                                <button
                                    onClick={handleCODOrder}
                                    disabled={loading}
                                    className="bg-brand-orange text-white font-bold py-4 px-16 rounded-sm shadow-lg hover:bg-[#eb5e1a] transition uppercase text-sm tracking-wide disabled:opacity-50"
                                >
                                    {loading ? "Placing Order..." : "Place Order"}
                                </button>
                            </div>
                        )}

                        {['GIFT', 'EMI_FK', 'EMI'].includes(selectedMethod) && (
                            <div className="flex items-center justify-center h-full text-gray-400 font-medium">
                                Feature coming soon...
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Price Details */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Apply Coupon Section */}
                    <div className="bg-white shadow-sm p-4 rounded-[2px]">
                        <h3 className="text-gray-500 font-bold uppercase text-[13px] mb-3">Apply Coupon</h3>

                        {appliedCoupon ? (
                            <div className="flex items-center justify-between p-2 border-2 border-green-500 bg-green-50 square">
                                <div className="flex items-center gap-2">
                                    <div className="bg-green-100 p-1 rounded-full">
                                        <ShieldCheck size={16} className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-green-700 text-sm mb-0">{appliedCoupon.code}</p>
                                        <p className="text-[10px] text-green-600 font-medium">You save {formatPrice(couponDiscount)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleRemoveCoupon}
                                    className="text-red-600 hover:text-red-700 font-bold text-xs uppercase"
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
                                        className="px-6 py-2 bg-brand-orange text-white font-medium text-sm rounded hover:bg-brand-orange-hover transition disabled:opacity-50"
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
                                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-tight">Save up to {formatPrice(maxPossibleRedemption)} on this order</p>
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

                    <div className="bg-white shadow-sm p-4 h-fit rounded-[2px]">
                        <h3 className="text-gray-500 font-bold uppercase text-[15px] border-b pb-3 mb-4">Price Details</h3>

                        <div className="space-y-4 text-[15px]">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-900 flex items-center gap-1 cursor-pointer" onClick={() => setIsMRPVisible(!isMRPVisible)}>
                                        Price ({cart?.length} items) {isMRPVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </span>
                                    <span className="text-gray-900">{formatPrice(totalMRP)}</span>
                                </div>
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

                            <div className="border-t border-dashed py-4 flex justify-between font-bold text-lg text-gray-900">
                                <span>Total Payable</span>
                                <span>{formatPrice(finalAmount)}</span>
                            </div>

                            <div className="h-px bg-gray-100 border-t border-dashed"></div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-800 font-medium border-b border-dotted border-gray-400">Cashback</span>
                                <span className="text-green-600 font-bold">₹27</span>
                            </div>
                        </div>

                        <div className="bg-[#f2fff6] p-4 flex items-center justify-between border-t border-green-100">
                            <div>
                                <p className="text-green-700 font-bold text-sm">5% Cashback</p>
                                <p className="text-green-600 text-[11px] font-medium">Claim now with payment offers</p>
                            </div>
                            <div className="flex -space-x-2">
                                <div className="w-7 h-7 bg-white rounded-full border border-gray-100 flex items-center justify-center z-30 shadow-sm overflow-hidden p-1"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="upi" /></div>
                                <div className="w-7 h-7 bg-white rounded-full border border-gray-100 flex items-center justify-center z-20 shadow-sm overflow-hidden p-1 px-1.5"><img src="https://upload.wikimedia.org/wikipedia/commons/d/d6/Visa_2014_logo_detail.svg" alt="visa" /></div>
                                <div className="w-7 h-7 bg-[#f5f5f6] rounded-full border border-gray-100 flex items-center justify-center z-10 shadow-sm text-[9px] font-bold text-gray-500">+3</div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {rewardData && (
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
            )}
        </div>
    );
};

const PaymentForm = ({ amount, onSuccess, loading, setLoading }) => {
    const stripe = useStripe();
    const elements = useElements();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        try {
            const { error, paymentMethod } = await stripe.createPaymentMethod({
                type: 'card',
                card: elements.getElement(CardElement),
            });

            if (error) {
                console.error(error);
                toastError(error.message);
            } else {
                await onSuccess(paymentMethod.id);
            }
        } catch (err) {
            console.error(err);
            toastError("Payment failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-sm font-bold text-gray-800 mb-4">Enter Card Details</p>
            <div className="p-4 border border-gray-200 rounded-sm bg-white shadow-sm">
                <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '14px' } } }} />
            </div>
            <button
                disabled={!stripe || loading}
                className="w-full bg-brand-orange text-white font-bold py-4 rounded-sm shadow-lg hover:bg-[#eb5e1a] transition uppercase text-sm tracking-wide flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : `Pay ₹${amount}`}
            </button>
            <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">100% Safe and Secure Payments</p>
        </form>
    );
};

export default CompletePaymentPage;
