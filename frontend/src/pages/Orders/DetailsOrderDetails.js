import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronRight, Star, MessageSquare, Download, MapPin, Receipt, Clock, Info, XCircle, Zap } from "lucide-react";
import { formatPrice, parsePrice, getPaymentMode } from "../../utils/format";
import { toastError, toastSuccess } from "../../utils/toast";
import CancelOrderModal from "../../components/CancelOrderModal/CancelOrderModal";
import generateInvoice from "../../utils/generateInvoice";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const DetailsOrderDetails = () => {
    const [searchParams] = useSearchParams();
    const orderIdParam = searchParams.get('order_id');
    const itemIdParam = searchParams.get('item_id');
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showOffersEarned, setShowOffersEarned] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderIdParam) {
                setError("Order ID is missing");
                setLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem("userToken");
                const res = await axios.get(`${API_BASE_URL}/orders/${orderIdParam}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setOrder(res.data.order);
            } catch (err) {
                console.error("Order Fetch Error:", err);
                setError(err.response?.data?.message || "Failed to load order details");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderIdParam]);

    if (loading) return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-orange"></div>
        </div>
    );

    if (error || !order) return (
        <div className="min-h-screen bg-gray-100 p-10 text-center">
            <p className="text-red-500 font-bold mb-4">{error || "Order not found"}</p>
            <Link to="/account/orders/" className="text-blue-600 hover:underline">Go back to My Orders</Link>
        </div>
    );

    // Identify the specific item being viewed
    const selectedItem = order.items.find(item =>
        String(item.product_id) === String(itemIdParam) ||
        String(item.id) === String(itemIdParam)
    ) || order.items[0];

    // Address Parsing
    let address = order.shipping_address;
    try {
        if (typeof address === 'string') address = JSON.parse(address);
    } catch (e) { }



    const steps = order.status === 'cancelled' ? [
        { label: "Order Confirmed", status: "pending", date: order.created_at },
        { label: "Cancelled", status: "cancelled", date: order.updated_at || order.created_at }
    ] : [
        { label: "Order Confirmed", status: "pending", date: order.created_at },
        { label: "Shipped", status: "shipped", date: null },
        { label: "Out for delivery", status: "delivered", date: null },
        { label: "Delivered", status: "delivered", date: order.status === 'delivered' ? order.updated_at || order.created_at : null }
    ];

    const currentStatusIndex = order.status === 'cancelled' ? 1 : (order.status === 'delivered' ? 3 : (order.status === 'shipped' ? 1 : (order.status === 'processing' ? 1 : 0)));

    const handleCancelOrder = async (reason) => {
        setIsCancelling(true);
        try {
            const token = localStorage.getItem("userToken");
            await axios.post(`${API_BASE_URL}/orders/${order.internalId || order.id}/cancel`, { reason }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrder({ ...order, status: 'cancelled', cancellation_reason: reason });
            setShowCancelModal(false);
            toastSuccess("Order cancelled successfully");
        } catch (err) {
            console.error(err);
            toastError("Failed to cancel order");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleDownloadInvoice = () => {
        try {
            // Transform order data to match invoice generator format
            const invoiceOrder = {
                id: order.order_id || order.id,
                user_name: order.user_name || 'Customer',
                user_email: order.user_email || '',
                shipping_address: order.shipping_address || '',
                created_at: order.created_at,
                payment_status: order.payment_status || 'Completed',
                items: order.items.map(item => ({
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity || item.qty || 1,
                    color: item.color,
                    size: item.size
                }))
            };

            generateInvoice(invoiceOrder, {
                companyName: 'Your Store',
                companyAddress: '123 Business Street, City, State 123456',
                companyEmail: 'support@yourstore.com',
                companyPhone: '+91 9876543210',
                companyGST: 'GSTIN: 22AAAAA0000A1Z5'
            });
        } catch (err) {
            console.error('Failed to generate invoice', err);
            alert('Failed to download invoice. Please try again.');
        }
    };



    // Calculate Product-Level Cancellation Policy
    const orderCreatedAt = new Date(order.created_at);
    const now = new Date();

    // Get the strictest policy from all items (shortest duration or any non-cancellable)
    let canCancelOrder = true;
    let cancellationReason = "";
    let policyEndDate = null;
    let hasNonCancellableItem = false;

    if (order.items && order.items.length > 0) {
        let minDuration = Infinity;

        for (const item of order.items) {
            if (item.is_cancellable === 0) {
                hasNonCancellableItem = true;
                canCancelOrder = false;
                cancellationReason = `Item "${item.name}" is non-cancellable.`;
                break;
            }

            const duration = parseInt(item.cancellation_duration) || 7;
            if (duration < minDuration) {
                minDuration = duration;
            }
        }

        if (!hasNonCancellableItem) {
            const deadline = new Date(orderCreatedAt);
            deadline.setDate(deadline.getDate() + minDuration);
            policyEndDate = deadline;

            if (now > deadline) {
                canCancelOrder = false;
                cancellationReason = `Cancellation window has expired (${minDuration} days from order date).`;
            }
        }
    }

    // Fallback to 7 days if no policy data
    if (!policyEndDate) {
        policyEndDate = new Date(orderCreatedAt);
        policyEndDate.setDate(policyEndDate.getDate() + 7);
        if (now > policyEndDate) {
            canCancelOrder = false;
            cancellationReason = "Cancellation window has expired (7 days from order date).";
        }
    }

    const returnPolicyDate = policyEndDate;
    const returnPolicyOver = !canCancelOrder;

    return (
        <div className="min-h-screen bg-[#f1f3f6] pb-10">
            {/* Breadcrumbs */}
            <div className="bg-white px-4 py-3 shadow-sm">
                <div className="max-w-[1248px] mx-auto flex items-center gap-2 text-sm text-gray-600 overflow-x-auto">
                    <Link to="/" className="hover:text-blue-600 transition-colors whitespace-nowrap font-medium">Home</Link>
                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                    <Link to="/account/profile/" className="hover:text-blue-600 transition-colors whitespace-nowrap font-medium">My Account</Link>
                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                    <Link to="/account/orders/" className="hover:text-blue-600 transition-colors whitespace-nowrap font-medium">My Orders</Link>
                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 font-semibold truncate">{order.order_id || order.id}</span>
                </div>
            </div>

            <div className="max-w-[1248px] mx-auto px-2 md:px-4 mt-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

                {/* Main Content Area */}
                <div className="space-y-4">

                    {/* Top Tracking Info Card */}
                    <div className="bg-white p-3 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="text-sm">
                            <p className="text-gray-800 font-medium font-sans">Order can be tracked by {address?.mobile || order.user_phone || "your registry phone"}.</p>
                            <p className="text-gray-500 text-xs">Tracking link is shared {address?.mobile ? "via SMS" : "to your account"}.</p>
                        </div>
                        <button className="flex items-center justify-between w-full md:w-auto text-sm font-bold text-gray-800 border-t md:border-t-0 md:pt-0">
                            Manage who can access
                            <ChevronRight size={16} className="text-gray-400 ml-2" />
                        </button>
                    </div>

                    {/* Product & Tracking Card */}
                    <div className="bg-white shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-6 relative">
                        {/* Product Image & Meta */}
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedItem.name}</h2>
                            <div className="flex flex-col gap-1">
                                {(selectedItem.color || selectedItem.size) && (
                                    <p className="text-sm text-gray-500">
                                        {[selectedItem.color, selectedItem.size].filter(Boolean).join(', ')}
                                    </p>
                                )}
                                {selectedItem.selected_options && Object.entries(typeof selectedItem.selected_options === 'string' ? JSON.parse(selectedItem.selected_options) : selectedItem.selected_options).map(([key, value]) => (
                                    <p key={key} className="text-sm text-gray-500">{key}: {value}</p>
                                ))}
                            </div>
                            <p className="text-sm text-gray-600 mb-2 font-semibold">
                                Seller: {selectedItem.shop_slug ? (
                                    <Link to={`/shop/${selectedItem.shop_slug}/`} className="text-blue-600 hover:underline">
                                        {selectedItem.shop_name || "KLPLWORLDRetail"}
                                    </Link>
                                ) : (
                                    selectedItem.shop_name || "KLPLWORLDRetail"
                                )}
                            </p>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl font-bold text-gray-900">
                                    {order.redeemed_points > 0 ? (
                                        <span className="flex items-center gap-1 font-sans">
                                            ₹{Math.round(parsePrice(order.total)).toLocaleString()} + <span className="text-yellow-500 flex items-center gap-1 font-bold"><Zap size={18} fill="currentColor" className="text-yellow-400" /> {order.redeemed_points}</span>
                                        </span>
                                    ) : formatPrice(selectedItem.sale_price || selectedItem.price)}
                                </span>
                            </div>

                            {/* Vertical Stepper (Mobile & Desktop) */}
                            <div className="mt-8 space-y-8 relative pl-6">
                                {/* Vertical Line */}
                                <div className="absolute left-[7px] top-[10px] bottom-[10px] w-0.5 bg-gray-200"></div>
                                <div
                                    className={`absolute left-[7px] top-[10px] w-0.5 transition-all duration-700 ${order.status === 'cancelled' ? 'bg-red-500' : 'bg-green-500'}`}
                                    style={{ height: `${Math.max(0, currentStatusIndex) * 48}px` }}
                                ></div>

                                {steps.map((step, idx) => {
                                    const isCompleted = idx <= currentStatusIndex;
                                    const stepDate = idx === 0 ? order.created_at : (idx === currentStatusIndex ? order.updated_at || order.created_at : null);

                                    return (
                                        <div key={idx} className="flex gap-4 relative">
                                            {/* Step Dot */}
                                            <div className={`absolute left-[-23px] top-1 w-4 h-4 rounded-full border-2 ${isCompleted ? (order.status === 'cancelled' ? "bg-red-500 border-red-500" : "bg-green-500 border-green-500") : "bg-white border-gray-300"} z-10 flex items-center justify-center`}>
                                                {isCompleted && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                            </div>
                                            <div className="flex flex-col">
                                                <p className={`text-base font-semibold ${isCompleted ? "text-gray-900" : "text-gray-400"}`}>
                                                    {step.label}{isCompleted && stepDate && `, ${new Date(stepDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                                                </p>
                                                {isCompleted && idx === currentStatusIndex && (
                                                    <p className="text-xs text-gray-600 mt-1">Your item has been {step.status === 'delivered' ? 'delivered' : (step.status === 'shipped' ? 'shipped' : 'confirmed')}.</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button className="text-blue-600 text-sm font-bold mt-8 flex items-center gap-1 hover:underline">
                                See All Updates <ChevronRight size={14} />
                            </button>

                            {order.status === 'cancelled' && (
                                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                                        <Info size={16} />
                                        Cancellation Information
                                    </div>
                                    <p className="text-xs text-red-600 mb-2">
                                        <span className="font-bold uppercase text-[10px] tracking-wider text-red-400 block mb-1">Reason for cancellation</span>
                                        "{order.cancellation_reason || 'Requested by user'}"
                                    </p>
                                    {order.cancelled_at && (
                                        <p className="text-[10px] text-red-400 font-medium">
                                            Cancelled on {new Date(order.cancelled_at).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}

                            {order.status !== 'cancelled' && (
                                <div className="mt-6 relative group inline-block">
                                    <button
                                        onClick={() => setShowCancelModal(true)}
                                        disabled={isCancelling || !canCancelOrder}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-sm text-sm font-bold transition-all shadow-sm
                                            ${canCancelOrder
                                                ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
                                                : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"}`}
                                    >
                                        <XCircle size={18} />
                                        {isCancelling ? "Processing..." : (order.status === 'delivered' ? "Return Order" : "Cancel Order")}
                                    </button>
                                    {!canCancelOrder && (
                                        <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-gray-900 text-white text-[11px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed">
                                            {cancellationReason || "This order cannot be cancelled/returned."}
                                            <div className="absolute top-full left-6 border-8 border-transparent border-t-gray-900"></div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <p className="text-sm text-gray-600 mt-6 p-3 border-gray-200">
                                {returnPolicyOver
                                    ? `Cancellation/Return policy ended on ${returnPolicyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                    : `Cancellation/Return policy active until ${returnPolicyDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                            </p>
                        </div>

                        {/* Product Thumbnail (Right Floating) */}
                        <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 absolute right-6 top-6 md:static">
                            <img
                                src={`${API_BASE_URL}${selectedItem.image?.replace(/^\/?assets/, "/assets")}`}
                                alt={selectedItem.name}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Other Items in Order */}
                    {order.items.length > 1 && (
                        <div className="bg-white shadow-sm border border-gray-100 p-4 rounded-sm">
                            <h3 className="text-base font-bold text-gray-900 mb-4">Other items in this order</h3>
                            <div className="space-y-4">
                                {order.items.filter(item => item.id !== selectedItem.id && item.product_id !== selectedItem.product_id).map((item, idx) => (
                                    <div key={idx} className="flex gap-4 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                                        <div className="w-16 h-16 bg-gray-100 rounded-sm overflow-hidden flex-shrink-0 border border-gray-100">
                                            <img
                                                src={`${API_BASE_URL}${item.image?.replace(/^\/?assets/, "/assets")}`}
                                                alt={item.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <Link
                                                to={`/order_details?order_id=${order.orderId || order.id}&item_id=${item.id || item.product_id}`}
                                                className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                                            >
                                                {item.name}
                                            </Link>
                                            <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity || 1}</p>
                                            <div className="mt-1 font-bold text-sm text-gray-900 flex items-center gap-2">
                                                {formatPrice(item.sale_price || item.price)}
                                                {parsePrice(item.price) > parsePrice(item.sale_price) && (
                                                    <span className="text-xs text-gray-400 line-through font-normal">
                                                        {formatPrice(item.price)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/order_details?order_id=${order.orderId || order.id}&item_id=${item.id || item.product_id}`)}
                                            className="self-center px-3 py-1.5 border border-gray-200 text-xs font-bold text-gray-700 rounded hover:bg-gray-50 bg-white"
                                        >
                                            Track
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chat Button */}
                    <div className="bg-white shadow-sm border border-gray-100 p-4 flex justify-center">
                        <button
                            onClick={() => navigate(`/chat/3/${order.orderId || order.id}_${selectedItem.id || selectedItem.product_id}/`)}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                        >
                            <MessageSquare size={18} /> Chat with us
                        </button>
                    </div>

                    {/* Rate Your Experience Card */}
                    <div className="bg-white shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-3 border-b">
                            <h3 className="text-base font-bold text-gray-900">Rate your experience</h3>
                        </div>
                        <div className="p-3 flex flex-col items-center">
                            <div className="w-full flex items-center gap-3 mb-3">
                                <span className="bg-gray-100 p-2 rounded">
                                    <Clock size={18} className="text-gray-500" />
                                </span>
                                <span className="text-sm font-medium text-gray-800">Rate the product</span>
                            </div>

                            <div className="flex gap-4">
                                {[1, 2, 3, 4, 5].map(v => (
                                    <Star
                                        key={v}
                                        size={32}
                                        onClick={() => navigate(`/${selectedItem.slug}/write-review/itm${selectedItem.product_id || selectedItem.id}/`)}
                                        className="text-gray-200 hover:text-brand-orange cursor-pointer transition-colors"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Sidebar Column */}
                <div className="space-y-4">

                    {/* Delivery Details */}
                    <div className="bg-white shadow-sm border border-gray-100 rounded-sm overflow-hidden h-fit">
                        <div className="p-3 border-b bg-white">
                            <h3 className="text-base font-bold text-gray-900">Delivery details</h3>
                        </div>
                        <div className="p-3 space-y-4">
                            <div className="flex gap-4">
                                <div className="h-10 w-full flex items-center gap-3">
                                    <MapPin size={16} className="text-gray-500" />
                                    <p className="text-sm font-semibold text-gray-900 truncate mb-0">Home</p>
                                </div>
                            </div>
                            <div className="pt-0 mt-0 gap-3 px-3">
                                <p className="text-sm text-gray-700 leading-relaxed font-medium px-3">
                                    {address?.full_name || order.user_name}, {address?.flat_house ? `${address.flat_house}, ` : ''}{address?.address_line1 || address?.address}, {address?.city}, {address?.state} - {address?.zip_code || address?.pincode}
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <div className="w-5 h-5 flex items-center justify-center mt-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-user text-gray-400"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-900 font-bold">{address?.full_name || order.user_name || "Customer"} <span className="font-medium text-gray-600 ml-2">{address?.mobile}</span></p>
                                </div>
                            </div>

                            {/* Personalization Details */}
                            {selectedItem.customization_details && (
                                <div className="pt-4 border-t border-gray-100 mt-2">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Personalized Details</p>
                                    <div className="space-y-3">
                                        {(() => {
                                            try {
                                                const details = typeof selectedItem.customization_details === 'string'
                                                    ? JSON.parse(selectedItem.customization_details)
                                                    : selectedItem.customization_details;

                                                return Object.entries(details).filter(([_, v]) => v).map(([key, val]) => (
                                                    <div key={key} className="flex flex-col">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-0.5">
                                                            {key.split(' ')[0].replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                                        </span>
                                                        {key.toLowerCase().includes('image') ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewImage(`${API_BASE_URL}${val}`)}
                                                                className="text-sm text-blue-600 font-semibold hover:underline flex items-center gap-1 text-left"
                                                            >
                                                                View Uploaded Image
                                                                <ChevronRight size={12} />
                                                            </button>
                                                        ) : (
                                                            <span className="text-sm text-gray-800 font-medium italic">"{val}"</span>
                                                        )}
                                                    </div>
                                                ));
                                            } catch (e) {
                                                return null;
                                            }
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Price Details */}
                    <div className="bg-white shadow-sm border border-gray-100 rounded-sm overflow-hidden h-fit">
                        <div className="p-3 border-b bg-white">
                            <h3 className="text-base font-bold text-gray-900">Price details</h3>
                        </div>
                        <div className="p-3 px-6 space-y-4">
                            {(() => {
                                // Calculate values for the ENTIRE order since 'Total Amount' is for the order
                                // We want to show: Listing Price (All Items) - Discounts - Coupons - Coins + Shipping = Total

                                const totalMRP = order.items.reduce((sum, item) => sum + (parsePrice(item.price || item.sale_price) * (item.quantity || 1)), 0);
                                const totalSalePrice = order.items.reduce((sum, item) => sum + (parsePrice(item.sale_price || item.price) * (item.quantity || 1)), 0);

                                const couponDiscount = parsePrice(order.coupon_discount || 0);
                                const superCoinDiscount = parsePrice(order.redeemed_points || 0);
                                const totalParams = parsePrice(order.total); // Final amount paid

                                // Calculate shipping fee dynamically: Final Paid - (Sale Price - Coupon - Coins)
                                const calculatedShipping = totalParams - (totalSalePrice - couponDiscount - superCoinDiscount);
                                const shippingFee = (order.shipping_fee !== undefined && order.shipping_fee !== null) ? parsePrice(order.shipping_fee) : Math.max(0, calculatedShipping);

                                return (
                                    <>
                                        <div className="flex justify-between text-sm text-gray-800 font-sans">
                                            <span>Price ({order.items.length} item{order.items.length !== 1 ? 's' : ''})</span>
                                            <span className="font-medium">
                                                {totalMRP > totalSalePrice && (
                                                    <span className="line-through text-gray-400 mr-2">₹{Math.round(totalMRP).toLocaleString()}</span>
                                                )}
                                                ₹{Math.round(totalSalePrice).toLocaleString()}
                                            </span>
                                        </div>

                                        {/* Discount Row Removed as per request (merged into Price line-through) */}

                                        {couponDiscount > 0 && (
                                            <div className="flex justify-between text-sm text-green-600 font-sans">
                                                <span>Coupons for you</span>
                                                <span className="font-medium">-₹{Math.round(couponDiscount).toLocaleString()}</span>
                                            </div>
                                        )}

                                        {superCoinDiscount > 0 && (
                                            <div className="flex justify-between text-sm text-green-600 font-sans">
                                                <span>SuperCoins</span>
                                                <span className="font-medium">-₹{Math.round(superCoinDiscount).toLocaleString()}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between text-sm text-gray-800 font-sans">
                                            <span className="flex items-center gap-1">Delivery Charges</span>
                                            <span className="font-medium">
                                                {shippingFee <= 0 ? <span className="text-green-600">Free</span> : `₹${Math.round(shippingFee).toLocaleString()}`}
                                            </span>
                                        </div>

                                        <div className="pt-4 border-t border-dashed border-gray-300 flex justify-between text-base font-bold text-gray-900 font-sans">
                                            <span>Total Amount</span>
                                            <span className="flex items-center gap-1">
                                                ₹{Math.round(totalParams).toLocaleString()}
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}

                            <div className="pt-2 pb-0">
                                <div className="bg-gray-50 rounded p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">F</div>
                                        <span className="text-sm font-semibold text-gray-800">Payment method</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">{getPaymentMode(order.paymentId || order.payment_id)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleDownloadInvoice}
                                className="w-full py-3 border border-gray-300 rounded text-sm font-semibold text-gray-800 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                            >
                                <Download size={16} className="text-gray-600" /> Download Invoice
                            </button>
                        </div>

                        {/* Offers Earned Accordion */}
                        <div className="border-t bg-white">
                            <button
                                onClick={() => setShowOffersEarned(!showOffersEarned)}
                                className="w-full p-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-yellow-50 p-2 rounded-full">
                                        <Star size={16} className="text-yellow-500 fill-current" />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-800">Offers earned</span>
                                </div>
                                <ChevronRight size={16} className={`text-gray-500 transition-transform ${showOffersEarned ? 'rotate-90' : ''}`} />
                            </button>
                            {showOffersEarned && (
                                <div className="px-3 pb-2 pt-2 bg-gray-50 border-t">
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3 p-2 bg-white rounded border border-gray-200">
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-green-600 font-bold text-xs">₹</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900 mb-1">SuperCoins Earned</p>
                                                <p className="text-xs text-gray-600">You earned {Math.round(parsePrice(order.total) * 0.01)} SuperCoins on this order</p>
                                            </div>
                                        </div>
                                        {order.coupon_code && (
                                            <div className="flex items-start gap-3 p-3 bg-white rounded border border-gray-200">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <Receipt size={14} className="text-blue-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 mb-1">Coupon Applied</p>
                                                    <p className="text-xs text-gray-600">Code: {order.coupon_code}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
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

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="bg-white rounded-lg overflow-hidden max-w-lg w-full relative animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-2 right-2 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors z-10"
                        >
                            <XCircle size={20} className="text-gray-800" />
                        </button>
                        <div className="p-3 bg-gray-50 border-t flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Image Preview</span>

                        </div>
                        <div className="p-1">
                            <img
                                src={previewImage}
                                alt="Personalization Preview"
                                className="w-full h-auto object-contain max-h-[80vh]"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetailsOrderDetails;
