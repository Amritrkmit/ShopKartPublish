import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Package, Truck, CheckCircle, Clock, MapPin, Receipt, CreditCard, XCircle } from "lucide-react";
import AccountLayout from "../Account/AccountLayout";
import { formatPrice, parsePrice } from "../../utils/format";
import { toastSuccess, toastError } from "../../utils/toast";
import CancelOrderModal from "../../components/CancelOrderModal/CancelOrderModal";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const OrderDetails = () => {
    const { id: paramId } = useParams();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const queryId = queryParams.get("order_id");
    const id = paramId || queryId;
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const token = localStorage.getItem("userToken");
                const res = await axios.get(`${API_BASE_URL}/orders/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOrder(res.data.order);
            } catch (err) {
                console.error("Failed to fetch order details", err);
                setError(err.response?.data?.message || "Failed to fetch order details");
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetails();
    }, [id]);

    const handleCancelOrder = async (reason) => {
        setIsCancelling(true);
        try {
            const token = localStorage.getItem("userToken");
            await axios.post(`${API_BASE_URL}/orders/${order.internalId || id}/cancel`, { reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOrder(prev => ({ ...prev, status: 'cancelled', cancellation_reason: reason }));
            toastSuccess("Order cancelled successfully");
            setShowCancelModal(false);
        } catch (err) {
            console.error(err);
            toastError(err.response?.data?.message || "Failed to cancel order");
        } finally {
            setIsCancelling(false);
        }
    };

    if (loading) return (
        <AccountLayout>
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange"></div>
            </div>
        </AccountLayout>
    );

    if (error) return (
        <AccountLayout>
            <div className="bg-red-50 text-red-600 p-4 rounded-sm border border-red-100">
                {error}
            </div>
            <Link to="/account/orders/" className="mt-4 inline-flex items-center text-brand-orange hover:underline">
                <ChevronLeft size={20} /> Back to Orders
            </Link>
        </AccountLayout>
    );

    if (!order) return null;

    const steps = [
        { label: "Ordered", status: "pending", icon: <Clock size={20} /> },
        { label: "Processing", status: "processing", icon: <Package size={20} /> },
        { label: "Shipped", status: "shipped", icon: <Truck size={20} /> },
        { label: "Delivered", status: "delivered", icon: <CheckCircle size={20} /> }
    ];

    const currentStatusIndex = steps.findIndex(step => step.status === order.status);

    // Parse address if it's JSON
    let address = order.shipping_address;
    try {
        if (typeof address === 'string') {
            const parsed = JSON.parse(address);
            address = parsed;
        }
    } catch (e) { }

    const itemsSubtotal = order.items.reduce((sum, item) => sum + (parsePrice(item.sale_price || item.price) * (item.quantity || 1)), 0);
    const shippingCost = Math.max(0, parsePrice(order.total) - (itemsSubtotal - parsePrice(order.coupon_discount) - parsePrice(order.redeemed_points)));


    return (
        <AccountLayout>
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Link to="/account/orders/" className="inline-flex items-center text-gray-600 hover:text-brand-orange transition-colors">
                    <ChevronLeft size={20} />
                    <span className="ml-1 font-medium">Back to Orders</span>
                </Link>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                    {order.status !== 'cancelled' && (() => {
                        const allowedStatuses = ['pending', 'processing'];
                        const isStatusAllowed = allowedStatuses.includes(order.status);

                        // Calculate cancellation eligibility
                        const orderCreatedAt = new Date(order.created_at);
                        const now = new Date();
                        let reason = "";
                        let isWindowExpired = false;
                        let hasNonCancellableItem = false;

                        if (isStatusAllowed && order.items) {
                            for (const item of order.items) {
                                if (item.is_cancellable === 0) {
                                    hasNonCancellableItem = true;
                                    reason = `Item "${item.name}" is non-cancellable.`;
                                    break;
                                }
                                const duration = parseInt(item.cancellation_duration) || 7;
                                const deadline = new Date(orderCreatedAt);
                                deadline.setDate(deadline.getDate() + duration);
                                if (now > deadline) {
                                    isWindowExpired = true;
                                    reason = `Cancellation window for "${item.name}" has expired.`;
                                    break;
                                }
                            }
                        }

                        const canCancel = isStatusAllowed && !hasNonCancellableItem && !isWindowExpired;

                        return (
                            <div className="relative group">
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    disabled={isCancelling || !canCancel}
                                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md transition text-sm font-semibold whitespace-nowrap
                                        ${canCancel
                                            ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 shadow-sm"
                                            : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"}`}
                                >
                                    <XCircle size={16} /> {isCancelling ? "Cancelling..." : "Cancel Order"}
                                </button>
                                {!canCancel && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center border border-gray-700">
                                        {isWindowExpired || hasNonCancellableItem
                                            ? reason
                                            : "Cancellation is only available for orders in 'Pending' or 'Processing' status."}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <div className="text-right">
                        <p className="text-sm text-gray-500 uppercase font-bold tracking-wider">Order #{order.orderId}</p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>

            {/* Tracking System */}
            <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-6 mb-8">
                <style>
                    {`
                        @keyframes status-pulse {
                            0% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0.4); }
                            70% { box-shadow: 0 0 0 12px rgba(255, 107, 0, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(255, 107, 0, 0); }
                        }
                        .status-active-pulse {
                            animation: status-pulse 2s infinite;
                        }
                    `}
                </style>
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                        <div className="w-1 h-6 bg-brand-orange rounded-full"></div>
                        Track Order
                    </h3>
                    <div className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-gray-100">
                        Status: <span className={order.status === 'cancelled' ? 'text-red-500' : 'text-brand-orange'}>{order.status}</span>
                    </div>
                </div>

                <div className="relative px-4">
                    {/* Background Progress Line */}
                    <div className="absolute top-[18px] left-[40px] right-[40px] h-[3px] bg-gray-100 z-0 hidden md:block rounded-full"></div>

                    {/* Active Progress Line */}
                    <div
                        className="absolute top-[18px] left-[40px] h-[3px] bg-brand-orange z-0 transition-all duration-1000 hidden md:block rounded-full shadow-[0_0_8px_rgba(255,107,0,0.4)]"
                        style={{ width: `calc(${(Math.max(0, currentStatusIndex) / (steps.length - 1)) * 100}% - 40px)` }}
                    ></div>

                    <div className="flex flex-col md:flex-row justify-between relative z-10 gap-10 md:gap-0">
                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStatusIndex;
                            const isActive = index === currentStatusIndex;
                            const isCancelled = order.status === "cancelled";

                            let stepColor = "text-gray-400";
                            let iconBg = "bg-white border-gray-200 text-gray-400";

                            if (isCancelled) {
                                stepColor = "text-red-500";
                                iconBg = "bg-red-50 border-red-200 text-red-500";
                            } else if (isCompleted) {
                                stepColor = "text-gray-900";
                                iconBg = isActive ? "bg-brand-orange border-brand-orange text-white status-active-pulse" : "bg-green-500 border-green-500 text-white";
                            }

                            return (
                                <div key={step.label} className="flex md:flex-col items-center gap-4 md:gap-3 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 z-10 ${iconBg} ${isActive ? 'scale-110 shadow-lg' : 'scale-100'}`}>
                                        {isCompleted && !isActive ? <CheckCircle size={20} /> : step.icon}
                                    </div>
                                    <div className="text-left md:text-center">
                                        <p className={`text-xs md:text-sm font-black uppercase tracking-tight ${stepColor}`}>
                                            {step.label}
                                        </p>
                                        {isActive && !isCancelled && (
                                            <div className="mt-1 flex justify-center">
                                                <span className="px-2 py-0.5 bg-orange-100 text-brand-orange text-[9px] font-bold rounded-full uppercase tracking-tighter">
                                                    Current
                                                </span>
                                            </div>
                                        )}
                                        {isCompleted && !isActive && (
                                            <p className="text-[9px] text-green-600 font-bold uppercase mt-0.5 hidden md:block">
                                                Reached
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                {order.status === "cancelled" && (
                    <div className="mt-10 p-4 bg-red-50 border border-red-100 text-red-600 rounded-sm text-center font-bold text-sm flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                        This order has been cancelled and will not be processed further.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Items and Summary */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items List */}
                    <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="font-bold flex items-center gap-2">
                                <Package size={18} className="text-brand-orange" />
                                Items ({order.items.length})
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {order.items.map((item, idx) => {
                                const sellingPrice = parsePrice(item.sale_price || item.price);
                                const mrp = parsePrice(item.price || item.sale_price);
                                const hasDiscount = mrp > sellingPrice;
                                const discountPercent = hasDiscount ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

                                return (
                                    <div key={idx} className="p-4 flex gap-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="w-20 h-20 bg-gray-100 rounded-sm overflow-hidden flex-shrink-0 border border-gray-100">
                                            {item.image ? (
                                                <img src={`${API_BASE_URL}${item.image.replace(/^\/?assets/, "/assets")}`} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
                                            )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <h4 className="font-bold text-gray-900 text-base">{item.name}</h4>
                                            <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity || 1}</p>

                                            {(item.selected_options || item.size || item.color) && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {item.selected_options && Object.entries(typeof item.selected_options === 'string' ? JSON.parse(item.selected_options) : item.selected_options).map(([key, value]) => (
                                                        <span key={key} className="bg-gray-50 text-gray-500 text-[10px] px-1.5 py-0.5 rounded border border-gray-100 font-medium">
                                                            {key}: {value}
                                                        </span>
                                                    ))}
                                                    {item.size && (
                                                        <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded border border-blue-100 font-medium">Size: {item.size}</span>
                                                    )}
                                                    {item.color && (
                                                        <span className="bg-purple-50 text-purple-600 text-[10px] px-1.5 py-0.5 rounded border border-purple-100 font-medium">Color: {item.color}</span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="mt-2 flex flex-col gap-1 items-start">
                                                <div className="flex flex-row gap-2 items-center">
                                                    <span className="text-brand-orange font-bold text-lg leading-tight">{formatPrice(sellingPrice)}</span>
                                                    {hasDiscount && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-gray-400 !line-through">{formatPrice(mrp)}</span>
                                                            <span className="text-xs text-green-600 font-bold">{discountPercent}% off</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {item.gb_discount_percentage > 0 && (
                                                    <div className="flex items-center gap-1.5 bg-green-50 px-2 py-0.5 rounded-sm border border-green-100">
                                                        <span className="text-[10px] text-green-700 font-black uppercase tracking-wider">Group Buy Reward</span>
                                                        <span className="text-[10px] text-green-600 font-bold">
                                                            Saved {formatPrice((parsePrice(item.sale_price || item.price) * parseFloat(item.gb_discount_percentage) / 100) * (item.quantity || 1))}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="mt-1">
                                                    {item.is_cancellable === 0 ? (
                                                        <span className="bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded font-bold border border-red-100 uppercase tracking-tight">Non-cancellable</span>
                                                    ) : (
                                                        <span className="bg-green-50 text-green-700 text-[10px] px-2 py-1 rounded font-bold border border-green-100 uppercase tracking-tight">{item.cancellation_duration || 7} Days Cancellation</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-sm border border-gray-100 shadow-sm p-4">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <MapPin size={18} className="text-brand-orange" />
                            Delivery Address
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                            {(() => {
                                let parsedAddr = address;
                                try {
                                    while (typeof parsedAddr === 'string') {
                                        const p = JSON.parse(parsedAddr);
                                        parsedAddr = p;
                                    }
                                } catch (e) { }

                                if (typeof parsedAddr === 'object' && parsedAddr !== null) {
                                    return (
                                        <>
                                            <p className="font-bold text-gray-900">{parsedAddr.full_name || parsedAddr.name || order.user_name}</p>
                                            <p>{parsedAddr.flat_house ? `${parsedAddr.flat_house}, ` : ''}{parsedAddr.address_line1 || parsedAddr.address}</p>
                                            <p>{parsedAddr.city}, {parsedAddr.state} - {parsedAddr.zip_code || parsedAddr.pincode}</p>
                                            <p className="pt-2"><span className="font-medium text-gray-500">Phone:</span> {parsedAddr.mobile || parsedAddr.phone}</p>
                                            {parsedAddr.alternate_mobile && <p><span className="font-medium text-gray-500">Alt Phone:</span> {parsedAddr.alternate_mobile}</p>}
                                        </>
                                    );
                                }
                                return <p>{address}</p>;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Price Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="font-bold flex items-center gap-2">
                                <Receipt size={18} className="text-brand-orange" />
                                Payment Summary
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {(() => {
                                const totalMRPValue = order.items.reduce((sum, item) => sum + (parseFloat(item.price || item.sale_price) * (item.quantity || 1)), 0);
                                const totalSalePriceValue = order.items.reduce((sum, item) => sum + (parseFloat(item.sale_price || item.price) * (item.quantity || 1)), 0);
                                const totalRegularDiscount = order.items.reduce((sum, item) => {
                                    const mrp = parseFloat(item.price);
                                    const sp = parseFloat(item.sale_price);
                                    const gbPercentage = parseFloat(item.gb_discount_percentage || 0);
                                    const totalSavings = mrp - sp;
                                    const gbReward = Math.round((sp * gbPercentage) / 100);
                                    const regDisc = Math.max(0, totalSavings - gbReward);
                                    return sum + (regDisc * (item.quantity || 1));
                                }, 0);
                                const totalGBRewardValue = order.items.reduce((sum, item) => {
                                    if (item.gb_discount_percentage > 0) {
                                        const sp = parseFloat(item.sale_price || item.price);
                                        const discountAmount = Math.round((sp * item.gb_discount_percentage) / 100);
                                        return sum + (discountAmount * (item.quantity || 1));
                                    }
                                    return sum;
                                }, 0);

                                return (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Total MRP</span>
                                            <span className="font-medium">{formatPrice(totalMRPValue)}</span>
                                        </div>
                                        {totalRegularDiscount > 0 && (
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>Product Discount</span>
                                                <span>-{formatPrice(totalRegularDiscount)}</span>
                                            </div>
                                        )}
                                        {totalGBRewardValue > 0 && (
                                            <div className="flex justify-between text-sm text-green-600 font-bold">
                                                <span>Group Buy Reward</span>
                                                <span>-{formatPrice(totalGBRewardValue)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-50">
                                            <span className="text-gray-500 font-bold">Order Subtotal</span>
                                            <span className="font-bold text-gray-900">{formatPrice(totalSalePriceValue)}</span>
                                        </div>
                                    </>
                                );
                            })()}

                            {parseFloat(order.coupon_discount) > 0 && (
                                <div className="flex justify-between text-sm text-blue-600">
                                    <span className="flex items-center gap-1">Coupon ({order.coupon_code})</span>
                                    <span>-{formatPrice(order.coupon_discount)}</span>
                                </div>
                            )}

                            {parseFloat(order.redeemed_points) > 0 && (
                                <div className="flex justify-between text-sm text-amber-600 font-medium">
                                    <span>SuperCoins Used</span>
                                    <span>-{formatPrice(order.redeemed_points)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Shipping Fee</span>
                                <span className={`font-medium ${shippingCost <= 0 ? 'text-green-600' : ''}`}>
                                    {shippingCost > 0 ? formatPrice(shippingCost) : 'FREE'}
                                </span>
                            </div>

                            <div className="pt-3 border-t border-gray-50 mt-3 flex justify-between items-center">
                                <span className="font-bold text-gray-900">Total Paid</span>
                                <span className="text-xl font-bold text-brand-orange">{formatPrice(order.total)}</span>
                            </div>

                            <div className="mt-2 pt-2 border-t border-gray-100">
                                <div className={`p-2 rounded-sm flex items-center justify-between ${order.payment_status === 'paid' ? 'bg-green-50/50 border border-green-100' :
                                    order.payment_status === 'failed' ? 'bg-red-50/50 border border-red-100' :
                                        'bg-amber-50/50 border border-amber-100'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-600' :
                                            order.payment_status === 'failed' ? 'bg-red-100 text-red-600' :
                                                'bg-amber-100 text-amber-600'
                                            }`}>
                                            {order.payment_status === 'paid' ? <CheckCircle size={18} /> :
                                                order.payment_status === 'failed' ? <CreditCard size={18} /> :
                                                    <Clock size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider leading-none mb-1">Payment Status</p>
                                            <p className={`text-sm font-black uppercase tracking-tight ${order.payment_status === 'paid' ? 'text-green-700' :
                                                order.payment_status === 'failed' ? 'text-red-700' :
                                                    'text-amber-700'
                                                }`}>
                                                {order.payment_status || 'PENDING'}
                                            </p>
                                        </div>
                                    </div>
                                    {order.paymentId && (
                                        <div className="text-right">
                                            <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Payment ID</p>
                                            <p className="text-[10px] font-medium text-gray-600 font-mono tracking-tighter">{order.paymentId}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <CancelOrderModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleCancelOrder}
                orderId={order.orderId || order.id}
                isCancelling={isCancelling}
            />
        </AccountLayout>
    );
};

export default OrderDetails;
