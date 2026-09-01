/**
 * Calculate fees for a seller order item.
 * @param {number} price - Sale price of the item
 * @param {number} commissionRate - Percentage (e.g., 10 for 10%)
 * @returns {object} - Breakdown of fees
 */
const calculateItemFees = (price, commissionRate = 10) => {
    // 1. Commission/Referral Fee
    // Zero commission for products below ₹1,000 as per user requirement
    let commission = 0;
    if (price >= 1000) {
        commission = (price * commissionRate) / 100;
    }

    // 2. Closing/Per-Order Fees
    // Fixed fee per order (₹5–₹50+ depending on price)
    let closingFee = 0;
    if (price < 500) closingFee = 5;
    else if (price < 1000) closingFee = 15;
    else if (price < 2000) closingFee = 25;
    else if (price < 5000) closingFee = 40;
    else closingFee = 60;

    // 3. Shipping / Fulfillment
    // Flat estimate for simulation, can be more complex based on weight/volumetric
    let shippingFee = 45;

    const totalFees = commission + closingFee + shippingFee;
    const netEarnings = price - totalFees;

    return {
        price,
        commission,
        closingFee,
        shippingFee,
        totalFees,
        netEarnings
    };
};

module.exports = { calculateItemFees };
