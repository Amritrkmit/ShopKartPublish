const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail', // or use 'host', 'port' if using other providers
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, html) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("[EMAIL] Skipping email send. EMAIL_USER or EMAIL_PASS not set in .env");
        console.log(`[EMAIL] To: ${to}\nSubject: ${subject}\nBody: ${html.substring(0, 100)}...`);
        return;
    }

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Sent to ${to}`);
    } catch (error) {
        console.error("[EMAIL] Failed to send:", error);
    }
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
};

// Template for Order Confirmation
const sendOrderConfirmationEmail = async (order, user, items) => {
    const itemsHtml = items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
                <img src="${item.image ? item.image : ''}" alt="${item.name}" width="50" style="vertical-align: middle; margin-right: 10px;">
                ${item.name} (x${item.quantity})
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                ${formatCurrency(item.sale_price || item.price)}
            </td>
        </tr>
    `).join('');

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #2874f0; text-align: center;">Order Confirmed!</h2>
            <p>Hi ${user.name},</p>
            <p>Thank you for your order. We have received it and will begin processing it soon.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Order ID:</strong> #${order.id}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Payment Method:</strong> ${order.payment_id ? 'Online/Card' : 'Cash on Delivery'}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f1f3f6;">
                        <th style="padding: 10px; text-align: left;">Product</th>
                        <th style="padding: 10px; text-align: right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 10px; font-weight: bold; text-align: right;">Total With Discount:</td>
                        <td style="padding: 10px; font-weight: bold; text-align: right;">${formatCurrency(order.total_amount)}</td>
                    </tr>
                </tfoot>
            </table>

            <p style="margin-top: 20px;">We will notify you when your order is shipped.</p>
        </div>
    `;

    await sendEmail(user.email, `Order Confirmation - #${order.id}`, html);
};

// Template for Order Status Update
const sendOrderStatusEmail = async (order, user, status) => {
    let subject = `Order Update - #${order.id}`;
    let message = `Your order status has been updated to <strong>${status}</strong>.`;
    let color = '#2874f0';

    if (status === 'cancelled') {
        subject = `Order Cancelled - #${order.id}`;
        message = `Your order #${order.id} has been cancelled. ${order.cancellation_reason ? `<br><br><strong>Reason:</strong> ${order.cancellation_reason}` : ''}<br><br>If paid, a refund will be initiated within 5-7 business days.`;
        color = '#dc3545';
    } else if (status === 'delivered') {
        subject = `Order Delivered - #${order.id}`;
        message = `Your order #${order.id} has been delivered successfully! We hope you enjoy your purchase.`;
        color = '#28a745';
    }

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: ${color}; text-align: center;">${subject}</h2>
            <p>Hi ${user.name},</p>
            <p>${message}</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p><strong>Order ID:</strong> #${order.id}</p>
                <p><strong>Current Status:</strong> ${status.toUpperCase()}</p>
            </div>

            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/account/orders" style="background-color: #2874f0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order</a>
            </p>
        </div>
    `;

    await sendEmail(user.email, subject, html);
};

// Template for Price Drop Alert
const sendPriceAlertEmail = async (email, productName, oldPrice, newPrice, productId) => {
    const subject = `Price Drop Alert: ${productName}`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #28a745; text-align: center;">Great News! Price dropped!</h2>
            <p>We noticed you were watching <strong>${productName}</strong>.</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
                <p style="text-decoration: line-through; color: #777; font-size: 16px;">Was: ${formatCurrency(oldPrice)}</p>
                <p style="color: #2874f0; font-size: 24px; font-weight: bold; margin: 10px 0;">Now Only: ${formatCurrency(newPrice)}</p>
            </div>

            <p style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/product/${productId}" style="background-color: #2874f0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Buy Now Before It's Gone!</a>
            </p>
        </div>
    `;

    await sendEmail(email, subject, html);
};

// Template for Restock Alert
const sendStockAlertEmail = async (email, productName, productId) => {
    const subject = `Restock Alert: ${productName} is back!`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #2874f0; text-align: center;">It's Back in Stock!</h2>
            <p>Good news! The item you were interested in, <strong>${productName}</strong>, is now back in stock and available for purchase.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 18px; color: #333;">Don't wait, stock might be limited!</p>
            </div>

            <p style="text-align: center; margin-top: 30px;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/product/${productId}" style="background-color: #2874f0; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Shop Now</a>
            </p>
        </div>
    `;

    await sendEmail(email, subject, html);
};

module.exports = {
    sendOrderConfirmationEmail,
    sendOrderStatusEmail,
    sendPriceAlertEmail,
    sendStockAlertEmail
};
