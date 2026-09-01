/**
 * Formats a number or numeric string as Indian Rupee (INR) currency.
 * Example: 23999 -> ₹23,999.00
 * @param {number|string} amount - The numeric value to format
 * @returns {string} The formatted currency string
 */
export const formatPrice = (amount) => {
    if (amount === undefined || amount === null) return "₹0.00";

    return Number(amount).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

/**
 * Parses a price string or number into a clean number, removing commas.
 * @param {any} value - The value to parse
 * @returns {number} The parsed number
 */
export const parsePrice = (value) => {
    if (value === undefined || value === null || value === "") return 0;
    // Remove currency symbols, commas, and other non-numeric chars except decimal point
    const cleanValue = String(value).replace(/[^\d.-]/g, "");
    const num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
};

/**
 * Calculates a percentage discount.
 * @param {number} mrp 
 * @param {number} selling 
 * @returns {number} Rounded percentage
 */
export const calculateDiscount = (mrp, selling) => {
    if (!mrp || !selling || mrp <= selling) return 0;
    return Math.round(((mrp - selling) / mrp) * 100);
};

/**
 * Determines a human-readable payment mode label from a payment ID.
 * @param {string} paymentId 
 * @returns {string} e.g. "Cash on Delivery", "Prepaid (Card)", "UPI"
 */
export const getPaymentMode = (paymentId) => {
    if (!paymentId) return "Prepaid / Online";
    const pid = String(paymentId).trim();
    if (pid.startsWith("COD") || pid.startsWith("cod")) return "Cash on Delivery";
    if (pid.startsWith("pi_")) return "Prepaid (Card/Stripe)";
    if (pid.startsWith("pay_")) return "Prepaid (Razorpay)";
    return "Prepaid (Online)";
};
