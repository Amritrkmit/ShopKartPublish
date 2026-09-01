import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate a professional PDF invoice for an order
 * @param {Object} order - The order object containing all order details
 * @param {Object} options - Additional options for customization
 */
export const generateInvoice = (order, options = {}) => {
    const doc = new jsPDF();

    // Company details (can be customized)
    const companyName = options.companyName || 'Your Store';
    const companyAddress = options.companyAddress || '123 Business Street, City, State 123456';
    const companyEmail = options.companyEmail || 'support@yourstore.com';
    const companyPhone = options.companyPhone || '+91 9876543210';
    const companyGST = options.companyGST || 'GSTIN: 22AAAAA0000A1Z5';

    // Parse items
    let items = [];
    try {
        items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
    } catch (e) {
        console.error('Failed to parse items', e);
    }

    // Calculate totals
    const itemsSubtotal = items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity || item.qty || 1);
        return sum + (price * qty);
    }, 0);

    const couponDiscount = parseFloat(order.coupon_discount) || 0;
    const redeemedPoints = parseFloat(order.redeemed_points) || 0;
    const total = parseFloat(order.total_amount || 0);

    const taxRate = 0; // 0% GST to match application logic
    const tax = itemsSubtotal * taxRate;

    // Infer shipping cost: Total = Subtotal - Discounts + Shipping
    // Shipping = Total - (Subtotal - Coupon - Redeemed)
    const shippingCost = Math.max(0, total - (itemsSubtotal - couponDiscount - redeemedPoints));

    // Colors
    const primaryColor = [40, 116, 240]; // #dc3545
    const darkColor = [26, 32, 44];
    const grayColor = [107, 114, 128];

    // Header with gradient effect
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 45, 'F');

    // Company name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, 20, 25);

    // Invoice label
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('TAX INVOICE', 160, 18);
    doc.setFontSize(10);
    doc.text(`Invoice #: INV-${order.id || order.orderId}`, 145, 26);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, 145, 33);

    // Reset text color
    doc.setTextColor(...darkColor);

    // Company details section
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text(companyAddress, 20, 55);
    doc.text(`Email: ${companyEmail} | Phone: ${companyPhone}`, 20, 61);
    doc.text(companyGST, 20, 67);

    // Divider line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(20, 73, 190, 73);

    // Bill To section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('BILL TO:', 20, 82);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(order.user_name || order.customerName || 'Customer', 20, 89);
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text(order.user_email || order.email || 'N/A', 20, 95);

    // Parse shipping address
    let shippingAddr = order.shipping_address || order.address || 'Address not provided';
    if (typeof shippingAddr === 'string') {
        try {
            const parsed = JSON.parse(shippingAddr);
            shippingAddr = `${parsed.address_line1 || ''}, ${parsed.city || ''}, ${parsed.state || ''} ${parsed.zip_code || ''}`;
        } catch (e) {
            // Keep as string
        }
    }

    // Wrap long addresses
    const addressLines = doc.splitTextToSize(shippingAddr, 80);
    doc.text(addressLines, 20, 101);

    // Ship To section
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SHIP TO:', 120, 82);

    doc.setFont('helvetica', 'normal');
    doc.text(order.user_name || order.customerName || 'Customer', 120, 89);
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    const shipAddressLines = doc.splitTextToSize(shippingAddr, 70);
    doc.text(shipAddressLines, 120, 95);

    // Order details
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    const orderInfoY = 115;
    doc.text(`Order ID: #${order.id || order.orderId}`, 120, orderInfoY);
    doc.text(`Order Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, 120, orderInfoY + 5);
    doc.text(`Payment: ${order.payment_status || 'Pending'}`, 120, orderInfoY + 10);

    // Items table
    const tableStartY = 130;

    const tableColumns = [
        { header: '#', dataKey: 'index' },
        { header: 'Item Description', dataKey: 'name' },
        { header: 'Qty', dataKey: 'quantity' },
        { header: 'Unit Price', dataKey: 'price' },
        { header: 'Amount', dataKey: 'total' }
    ];

    const tableRows = items.map((item, index) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity || item.qty || 1);
        return {
            index: index + 1,
            name: item.name || 'Product',
            quantity: qty,
            price: `Rs.${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            total: `Rs.${(price * qty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        };
    });

    autoTable(doc, {
        startY: tableStartY,
        head: [tableColumns.map(col => col.header)],
        body: tableRows.map(row => [row.index, row.name, row.quantity, row.price, row.total]),
        theme: 'grid',
        headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            halign: 'center'
        },
        bodyStyles: {
            fontSize: 9,
            textColor: darkColor
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { cellWidth: 80 },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'right', cellWidth: 30 },
            4: { halign: 'right', cellWidth: 35 }
        },
        margin: { left: 20, right: 20 },
        alternateRowStyles: {
            fillColor: [249, 250, 251]
        }
    });

    // Summary section
    const finalY = doc.lastAutoTable.finalY + 10;

    // Summary box
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(110, finalY, 80, 50, 3, 3, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...grayColor);

    let summaryY = finalY + 8;
    doc.text('Subtotal:', 115, summaryY);
    doc.setTextColor(...darkColor);
    doc.text(`Rs.${itemsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, summaryY, { align: 'right' });

    if (couponDiscount > 0) {
        summaryY += 7;
        doc.setTextColor(...grayColor);
        doc.text(`Coupon (${order.coupon_code || 'Applied'}):`, 115, summaryY);
        doc.setTextColor(...darkColor);
        doc.text(`-Rs.${couponDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, summaryY, { align: 'right' });
    }

    if (redeemedPoints > 0) {
        summaryY += 7;
        doc.setTextColor(...grayColor);
        doc.text('SuperCoins Redeemed:', 115, summaryY);
        doc.setTextColor(...darkColor);
        doc.text(`-Rs.${redeemedPoints.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, summaryY, { align: 'right' });
    }

    if (tax > 0) {
        summaryY += 7;
        doc.setTextColor(...grayColor);
        doc.text('GST (0%):', 115, summaryY);
        doc.setTextColor(...darkColor);
        doc.text(`Rs.${tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, summaryY, { align: 'right' });
    }

    summaryY += 7;
    doc.setTextColor(...grayColor);
    doc.text('Shipping:', 115, summaryY);
    doc.setTextColor(...darkColor);
    doc.text(`Rs.${shippingCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, summaryY, { align: 'right' });

    // Total
    summaryY += 10;
    doc.setDrawColor(229, 231, 235);
    doc.line(115, summaryY - 4, 185, summaryY - 4);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL:', 115, summaryY + 2);
    doc.text(`Rs.${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 180, summaryY + 2, { align: 'right' });

    // Thank you note
    const noteY = finalY + 65;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkColor);
    doc.text('Thank you for your business!', 20, noteY);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text('If you have any questions about this invoice, please contact us at the email above.', 20, noteY + 7);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFillColor(...primaryColor);
    doc.rect(0, pageHeight - 15, 210, 15, 'F');

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('This is a computer-generated invoice. No signature required.', 105, pageHeight - 6, { align: 'center' });

    // Save the PDF
    const fileName = `Invoice-${order.id || order.orderId}-${new Date().getTime()}.pdf`;
    doc.save(fileName);

    return fileName;
};

export default generateInvoice;
