import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer, FileDown, Wand2, Image as ImageIcon, XCircle } from "lucide-react";
import { toastSuccess, toastError } from "../../utils/toast";
import { formatPrice } from "../../utils/format";
import { decryptId } from "../../utils/secureId";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "") + "/api";

const SellerOrderDetails = () => {
    const { id } = useParams();
    const decryptedId = decryptId(id) || id;

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState("");
    const [fulfillmentStatus, setFulfillmentStatus] = useState("");
    const [productionStatus, setProductionStatus] = useState("pending");
    const [previewImage, setPreviewImage] = useState(null);

    const fetchSingleOrder = useCallback(async () => {
        try {
            const token = localStorage.getItem("sellerToken");
            const res = await axios.get(`${API_BASE_URL}/orders/seller/${decryptedId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setOrder(res.data.order);
            setPaymentStatus(res.data.order.payment_status || "pending");
            setFulfillmentStatus(res.data.order.status || "pending");
            setProductionStatus(res.data.order.production_status || "pending");

        } catch (err) {
            console.error("Fetch error", err);
            toastError("Failed to load order details");
        } finally {
            setLoading(false);
        }
    }, [decryptedId]);

    useEffect(() => {
        fetchSingleOrder();
    }, [fetchSingleOrder]);

    const handleUpdateStatus = async () => {
        try {
            const token = localStorage.getItem("sellerToken");
            await axios.put(
                `${API_BASE_URL}/orders/${decryptedId}/status`,
                {
                    status: fulfillmentStatus,
                    payment_status: paymentStatus,
                    production_status: productionStatus
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toastSuccess("Order status updated!");

        } catch (err) {
            console.error("Update failed", err);
            toastError("Failed to update status");
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadInvoice = () => {
        toastSuccess("Invoice download starting...");
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading details...</div>;
    if (!order) return <div className="p-8 text-center text-gray-500">Order not found.</div>;

    const items = order.items || [];
    const itemsSubtotal = parseFloat(order.shop_total || 0);

    const hasColorData = items.some(item => item.color && item.color !== "-");
    const hasSizeData = items.some(item => item.size && item.size !== "-");

    return (
        <div className="p-4 max-w-7xl mx-auto print:p-0 min-h-screen bg-gray-50 -m-4 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 print:hidden">
                <Link to="/seller/orders/" className="flex items-center text-gray-500 hover:text-gray-700 transition-colors text-xs font-bold uppercase tracking-wider">
                    <ArrowLeft size={16} className="mr-2" /> Back to Orders
                </Link>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadInvoice}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
                    >
                        <FileDown size={14} /> Invoice
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
                    >
                        <Printer size={14} /> Print
                    </button>
                </div>
            </div>

            {/* Order Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">{order.order_id || "Order #" + order.id}</h1>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 font-medium uppercase tracking-tight">
                            Customer:
                            <span className="text-blue-600 hover:underline font-black cursor-default">
                                {order.user_name || "Guest"} ({order.user_email || order.user_id || "N/A"})
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="!text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1 !font-semibold">Payment Method</p>
                        <p className="!text-[11px] font-black text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 uppercase tracking-wider !font-semibold">
                            {order.payment_id?.startsWith('pay_') ? 'Prepaid (Stripe)' : 'Cash on Delivery'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Products */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Products Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-5 py-2 border-b border-gray-100 bg-gray-50/30">
                            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest pt-2">Ordered Products</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-5 py-2 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Product</th>
                                        {hasColorData && <th className="px-5 py-2 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Color</th>}
                                        {hasSizeData && <th className="px-5 py-2 text-left text-[9px] font-black text-gray-500 uppercase tracking-widest">Size</th>}
                                        <th className="px-5 py-2 text-right text-[9px] font-black text-gray-500 uppercase tracking-widest">Price</th>
                                        <th className="px-5 py-2 text-right text-[9px] font-black text-gray-500 uppercase tracking-widest">Qty</th>
                                        <th className="px-5 py-2 text-center text-[9px] font-black text-gray-500 uppercase tracking-widest">Policy</th>
                                        <th className="px-5 py-2 text-right text-[9px] font-black text-gray-500 uppercase tracking-widest">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-2">
                                                <div className="flex items-center gap-3">
                                                    {item.image && (
                                                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                                                            <img
                                                                src={`${API_BASE_URL.replace('/api', '')}${item.image.startsWith('/') ? '' : '/'}${item.image}`}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">
                                                            {item.name}
                                                        </p>
                                                        {item.selected_options && (
                                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                                {Object.entries(typeof item.selected_options === 'string' ? JSON.parse(item.selected_options) : item.selected_options).map(([key, value]) => (
                                                                    <span key={key} className="bg-gray-50 text-gray-500 text-[8px] px-1 py-0.5 rounded border border-gray-100 font-bold uppercase tracking-tight">
                                                                        {key}: {value}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {hasColorData && (
                                                <td className="px-5 py-2 text-xs font-bold text-gray-700">
                                                    {item.color || "-"}
                                                </td>
                                            )}
                                            {hasSizeData && (
                                                <td className="px-5 py-2 text-xs font-bold text-gray-700">
                                                    {item.size || "-"}
                                                </td>
                                            )}
                                            <td className="px-5 py-2 text-right">
                                                <div className="flex flex-col items-end">
                                                    {parseFloat(item.sale_price) < parseFloat(item.price) && (
                                                        <span className="text-[9px] text-gray-400 !line-through leading-none">{formatPrice(item.price)}</span>
                                                    )}
                                                    <span className="text-xs font-black text-gray-900">{formatPrice(item.sale_price || item.price)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-2 text-xs font-bold text-gray-700 text-right">
                                                {item.quantity || item.qty || 1}
                                            </td>
                                            <td className="px-5 py-2 text-center">
                                                {item.is_cancellable === 0 ? (
                                                    <span className="bg-red-50 text-red-600 text-[8px] px-1.5 py-0.5 rounded font-black border border-red-100 uppercase tracking-tighter">Non-cancellable</span>
                                                ) : (
                                                    <span className="bg-green-50 text-green-700 text-[8px] px-1.5 py-0.5 rounded font-black border border-green-100 uppercase tracking-tighter">{item.cancellation_duration || 7} Days Cancel</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-2 text-xs font-black text-gray-900 text-right">
                                                {formatPrice(parseFloat(item.sale_price || item.price) * (item.quantity || item.qty || 1))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-5 py-2 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-10">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Items subtotal</p>
                                <p className="text-base font-black text-gray-900">{formatPrice(itemsSubtotal)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Customer & Personalization Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Shipping Address */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col">
                            <h3 className="text-[11px] font-black text-gray-900 mb-3 border-b border-gray-100 pb-2 uppercase tracking-widest">Shipping Address</h3>
                            <div className="space-y-3 flex-grow">
                                {(() => {
                                    let address = order.shipping_address;
                                    try {
                                        while (typeof address === 'string') {
                                            const parsed = JSON.parse(address);
                                            address = parsed;
                                        }
                                    } catch (e) { }

                                    if (typeof address === 'object' && address !== null) {
                                        return (
                                            <div className="text-xs space-y-2">
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Recipient</p>
                                                    <p className="font-black text-gray-800 text-sm">{address.full_name || address.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Location</p>
                                                    <p className="text-gray-700 font-bold leading-tight">
                                                        {address.flat_house ? `${address.flat_house}, ` : ''}{address.address_line1 || address.address}<br />
                                                        {address.city}, {address.state} - {address.zip_code || address.pincode}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Contact</p>
                                                    <p className="font-black text-gray-800">{address.mobile || address.phone}</p>
                                                    {address.alternate_mobile && <p className="text-[10px] font-black uppercase text-gray-800">Alt: {address.alternate_mobile}</p>}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return <p className="text-xs font-bold text-gray-800 leading-relaxed italic">{order.shipping_address || "No address provided"}</p>;
                                })()}
                            </div>
                        </div>

                        {/* Personalization & Gift Details */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <h3 className="text-[11px] font-black text-gray-900 mb-3 border-b border-gray-100 pb-2 uppercase tracking-widest flex items-center gap-2">
                                <Wand2 size={12} className="text-orange-500" />
                                Personalization & Packaging
                            </h3>
                            <div className="space-y-3 text-xs">
                                {/* Customization Details from Items */}
                                {items.filter(item => item.customization_details).map((item, idx) => {
                                    try {
                                        const details = typeof item.customization_details === 'string'
                                            ? JSON.parse(item.customization_details)
                                            : item.customization_details;

                                        return (
                                            <div key={idx} className="p-2 bg-orange-50/50 rounded-lg border border-orange-100/50">
                                                <p className="text-[9px] text-orange-600 font-black uppercase tracking-widest mb-1.5 border-b border-orange-100/30 pb-0.5">
                                                    {item.name}
                                                </p>
                                                <div className="space-y-2">
                                                    {Object.entries(details).map(([key, val]) => (
                                                        <div key={key}>
                                                            <p className="text-gray-500 text-[8px] uppercase font-black tracking-tight mb-0.5">
                                                                {key.split(' ')[0].replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                                            </p>
                                                            {key.toLowerCase().includes('image') || key.toLowerCase().includes('photo') ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewImage(`${API_BASE_URL.replace('/api', '')}${val.startsWith('/') ? '' : '/'}${val}`)}
                                                                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-orange-200 rounded text-orange-600 text-[8px] font-black uppercase hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    <ImageIcon size={10} /> Reference File
                                                                </button>
                                                            ) : (
                                                                <p className="text-gray-900 font-black break-words leading-tight text-[11px]">{val}</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    } catch (e) { return null; }
                                })}

                                {/* Gift Options */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                                        <div className="flex flex-col">
                                            <span className="text-gray-400 text-[8px] font-black uppercase tracking-widest leading-none mb-1">Gift order</span>
                                            <span className="text-gray-900 font-black text-[11px]">{order.is_gift ? 'YES' : 'NO'}</span>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${order.is_gift ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-300'}`}>
                                            <ImageIcon size={12} />
                                        </div>
                                    </div>
                                    {order.is_gift && (
                                        <div className="space-y-3 pl-1">
                                            <div>
                                                <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest mb-0.5">Wrapping</p>
                                                <p className="text-gray-900 font-black text-[11px]">{order.gift_wrapping || 'Standard'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest mb-0.5">Recipient</p>
                                                <p className="text-gray-900 font-black text-[11px]">{order.gift_recipient || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 text-[8px] font-black uppercase tracking-widest mb-0.5">Gift Message</p>
                                                <div className="mt-0.5 p-2 bg-white border border-gray-100 rounded-lg text-gray-700 text-[10px] italic leading-tight font-serif shadow-sm">
                                                    "{order.gift_message || 'N/A'}"
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Summary & Status */}
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="text-[11px] font-black text-gray-900 mb-2 uppercase tracking-widest border-b border-gray-50 pb-2">Payment Summary</h2>
                        {(() => {
                            const totalGBReward = items.reduce((sum, item) => {
                                if (item.gb_discount_percentage > 0) {
                                    const sp = parseFloat(item.sale_price || item.price);
                                    const discountAmount = Math.round((sp * item.gb_discount_percentage) / 100);
                                    return sum + (discountAmount * (item.quantity || item.qty || 1));
                                }
                                return sum;
                            }, 0);

                            const couponDiscount = parseFloat(order.coupon_discount) || 0;
                            const redeemedPoints = parseFloat(order.redeemed_points) || 0;
                            const shippingCost = 0; // FREE for now as per design

                            return (
                                <div className="space-y-2.5 text-xs font-bold">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-tight">Total MRP</span>
                                        <span className="text-gray-900">{formatPrice(itemsSubtotal)}</span>
                                    </div>
                                    {totalGBReward > 0 && (
                                        <div className="flex justify-between items-center text-green-600">
                                            <span className="text-[10px] font-black uppercase tracking-tight flex items-center gap-1">
                                                GB Reward
                                            </span>
                                            <span className="font-black">-{formatPrice(totalGBReward)}</span>
                                        </div>
                                    )}
                                    {order.coupon_code && (
                                        <div className="flex justify-between items-center text-blue-600">
                                            <span className="text-[10px] font-black uppercase tracking-tight">Coupon ({order.coupon_code})</span>
                                            <span className="font-black">-{formatPrice(couponDiscount)}</span>
                                        </div>
                                    )}
                                    {redeemedPoints > 0 && (
                                        <div className="flex justify-between items-center text-amber-600">
                                            <span className="text-[10px] font-black uppercase tracking-tight">SuperCoins</span>
                                            <span className="font-black">-{formatPrice(redeemedPoints)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-tight">Shipping</span>
                                        <span className={`font-black ${shippingCost === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                            {shippingCost === 0 ? "FREE" : formatPrice(shippingCost)}
                                        </span>
                                    </div>
                                    <div className="border-t border-orange-100 pt-3 mt-1.5">
                                        <div className="flex justify-between items-center text-xl font-black text-brand-orange">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Paid Total</span>
                                            <span>{formatPrice(itemsSubtotal - totalGBReward - (couponDiscount / (items.length || 1)) - (redeemedPoints / (items.length || 1)) + shippingCost)}</span>
                                        </div>
                                        <p className="text-[8px] text-gray-400 text-right font-black uppercase tracking-widest mt-0.5">Included all taxes</p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Cancellation Details */}
                    {order.status === 'cancelled' && (
                        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-4">
                            <h2 className="text-[11px] font-black text-red-700 mb-3 uppercase tracking-widest border-b border-red-200 pb-2 flex items-center gap-2">
                                <span className="p-0.5 bg-red-100 rounded">
                                    <XCircle size={12} />
                                </span>
                                Cancellation
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-red-400 text-[9px] font-black uppercase tracking-widest mb-0.5">Reason</p>
                                    <p className="text-red-900 font-black bg-white p-2 rounded-lg border border-red-100 shadow-sm leading-tight italic text-[11px]">
                                        "{order.cancellation_reason || 'No reason provided'}"
                                    </p>
                                </div>
                                {order.cancelled_at && (
                                    <div>
                                        <p className="text-red-400 text-[9px] font-black uppercase tracking-widest mb-0.5">Cancelled On</p>
                                        <p className="text-red-900 font-black text-xs">
                                            {new Date(order.cancelled_at).toLocaleString('en-US', {
                                                weekday: 'short',
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Order Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <h2 className="text-[11px] font-black text-gray-900 mb-3 uppercase tracking-widest border-b border-gray-50 pb-2">Status Control</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Payment status
                                </label>
                                <select
                                    value={paymentStatus}
                                    onChange={(e) => setPaymentStatus(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-black text-gray-700 transition-all cursor-pointer text-[11px]"
                                >
                                    <option value="pending">PENDING</option>
                                    <option value="paid">PAID</option>
                                    <option value="failed">FAILED</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    Order status
                                </label>
                                <select
                                    value={fulfillmentStatus}
                                    onChange={(e) => setFulfillmentStatus(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-black text-gray-700 transition-all cursor-pointer text-[11px]"
                                >
                                    <option value="pending">PENDING</option>
                                    <option value="processing">PROCESSING</option>
                                    <option value="shipped">SHIPPED</option>
                                    <option value="delivered">DELIVERED</option>
                                    <option value="cancelled">CANCELLED</option>
                                </select>
                            </div>
                            {order.has_customized_items === 1 && (
                                <div>
                                    <label className="block text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1.5">
                                        Production
                                    </label>
                                    <select
                                        value={productionStatus}
                                        onChange={(e) => setProductionStatus(e.target.value)}
                                        className="w-full px-3 py-2 bg-orange-50/30 border border-orange-100 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none font-black text-orange-700 transition-all cursor-pointer text-[11px]"
                                    >
                                        <option value="pending">PENDING</option>
                                        <option value="in_production">IN PRODUCTION</option>
                                        <option value="ready">READY TO SHIP</option>
                                        <option value="shipped">SHIPPED</option>
                                        <option value="delivered">DELIVERED</option>
                                        <option value="cancelled">CANCELLED</option>
                                    </select>
                                </div>
                            )}
                            <button
                                onClick={handleUpdateStatus}
                                className="w-full px-4 py-2 bg-brand-orange text-white rounded-lg hover:bg-orange-600 transition-all font-black uppercase tracking-widest shadow-md shadow-orange-100 active:scale-95 text-[10px]"
                            >
                                Update Status
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="bg-white rounded-2xl overflow-hidden max-w-lg w-full relative animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-2 right-2 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors z-10"
                        >
                            <XCircle size={20} className="text-gray-800" />
                        </button>

                        <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personalization Image Preview</span>
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

export default SellerOrderDetails;
