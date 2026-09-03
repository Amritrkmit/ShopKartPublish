import { Eye, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useState } from "react";
import { formatPrice, getPaymentMode } from "../../utils/format";
import { toastSuccess, toastError } from "../../utils/toast";
import CancelOrderModal from "../CancelOrderModal/CancelOrderModal";

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "");

const OrderCard = ({ order: initialOrder }) => {
  const [order, setOrder] = useState(initialOrder);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCancelOrder = async (reason) => {
    setIsCancelling(true);
    try {
      const token = localStorage.getItem("userToken");
      await axios.post(`${API_BASE_URL}/orders/${order.internalId || order.id}/cancel`, { reason }, {
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

  return (
    <div className="border shadow-sm bg-white p-3 mb-6 hover:shadow-md transition">
      {/* Top Section */}
      <div className="flex justify-between items-center border-b mb-2">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Order ID:</span> {order.orderId || order.id}
        </p>
        <p className="text-sm text-gray-500">
          Placed on {new Date(order.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Products */}
      {order.items && order.items.map((item, idx) => {
        const itemPrice = item.sale_price || item.price;
        const regularPrice = item.price;
        const imageUrl = item.image ? `${API_BASE_URL.replace('/api', '')}${item.image}` : null;

        return (
          <div
            key={idx}
            className="flex justify-between items-start border-b pb-2 mb-2 last:border-0 last:pb-0 last:mb-0"
          >
            {/* Image */}
            <div className="w-20 h-20 flex-shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-md"
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/80"; }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-md">
                  <span className="text-xs text-gray-400">No Image</span>
                </div>
              )}
            </div>

            {/* Product Info & Price */}
            <div className="flex-1 ml-3 flex flex-col sm:flex-row justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 line-clamp-2">
                  {item.name}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-500 mt-1">
                  {item.color && (
                    <p>
                      <span className="font-medium">Color:</span> {item.color}
                    </p>
                  )}
                  {item.size && (
                    <p>
                      <span className="font-medium">Size:</span> {item.size}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Qty:</span> {item.quantity || 1}
                  </p>
                  <p className="flex items-center gap-1">
                    <span className="font-medium text-gray-900 border-l pl-3">Policy:</span>
                    {item.is_cancellable === 0 ? (
                      <span className="text-red-500 font-bold uppercase text-[10px]">Non-cancellable</span>
                    ) : (
                      <span className="text-green-600 font-bold uppercase text-[10px]">{item.cancellation_duration || 7} Days Cancellation</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div className="sm:text-right min-w-fit flex flex-col">
                <p className="text-base sm:text-sm font-bold text-gray-900">
                  {formatPrice(itemPrice * (item.quantity || 1))}
                </p>

                <span className="text-xs text-gray-400 !line-through">
                  {formatPrice(regularPrice * (item.quantity || 1))}
                </span>
              </div>

            </div>
          </div>
        );
      })}

      {/* Bottom Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 gap-4 pt-2">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${order.status === 'delivered' ? 'bg-green-500' :
              order.status === 'cancelled' ? 'bg-red-500' :
                (order.status === 'pending' || order.status === 'processing') ? 'bg-amber-500' :
                  'bg-blue-500'
              }`}></span>
            <span className={`text-sm font-bold uppercase tracking-wide ${order.status === 'delivered' ? 'text-green-600' :
              order.status === 'cancelled' ? 'text-red-600' :
                (order.status === 'pending' || order.status === 'processing') ? 'text-amber-600' :
                  'text-blue-600'
              }`}>
              {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "Completed"}
            </span>
          </div>
          <p className="text-[11px] text-gray-500">
            Payment: <span className="font-medium">{getPaymentMode(order.paymentId || order.payment_id)}</span>
          </p>
          {order.redeemed_points > 0 && (
            <p className="text-xs text-orange-600 font-bold">
              {order.redeemed_points} SuperCoins Redeemed
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <div className="sm:hidden flex justify-between items-center mb-1 text-gray-900">
            <span className="text-sm font-medium">Order Total:</span>
            <span className="text-lg font-black">{formatPrice(order.total || order.total_amount)}</span>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Link
              to={`/order_details?order_id=${order.orderId || order.id}&item_id=${order.items[0]?.product_id || order.items[0]?.id}`}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-100 rounded-md hover:bg-blue-100 transition text-sm font-semibold whitespace-nowrap"
            >
              <Eye size={16} /> View Details
            </Link>
            {order.status !== 'cancelled' && (
              <div className="flex-1 sm:flex-initial relative group">
                {(() => {
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
                    <>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        disabled={isCancelling || !canCancel}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md transition text-sm font-semibold whitespace-nowrap
                          ${canCancel
                            ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 shadow-sm"
                            : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60"}`}
                      >
                        <XCircle size={16} /> {isCancelling ? "Cancelling..." : "Cancel Order"}
                      </button>
                      {!canCancel && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-900 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center border border-gray-700">
                          {isWindowExpired || hasNonCancellableItem
                            ? reason
                            : "Cancellation is only available for orders in 'Pending' or 'Processing' status."}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-end ml-4">
            <div className="text-sm font-black text-gray-900 whitespace-nowrap">
              Total: {formatPrice(order.total || order.total_amount)}
            </div>
            <span className="text-xs text-gray-400 !line-through">
              MRP: {formatPrice((order.subtotal || order.subtotal_amount) || (order.items || []).reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0))}
            </span>
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
    </div>
  );
};

export default OrderCard;
