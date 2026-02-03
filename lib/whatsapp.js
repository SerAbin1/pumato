export const formatWhatsAppMessage = (cartItems, userDetails, totals) => {
    const { name, phone, address } = userDetails;
    const { itemTotal, deliveryCharge, finalTotal } = totals;

    let message = `*New Order from Pumato* 🍅\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${name}\n`;
    message += `Phone: ${phone}\n`;
    message += `Hostel: ${address}\n\n`;
    
    message += `*Order Details:*\n`;
    const groupedItems = cartItems.reduce((acc, item) => {
        const rName = item.restaurantName?.trim() || "Other Items";
        if (!acc[rName]) acc[rName] = [];
        acc[rName].push(item);
        return acc;
    }, {});

    Object.keys(groupedItems).forEach((rName) => {
        message += `\n*${rName}*\n`;
        groupedItems[rName].forEach((item, index) => {
            message += `${index + 1}. ${item.name} x ${item.quantity} - ₹${item.price * item.quantity}\n`;
        });
    });

    message += `\n----------------\n`;
    message += `Item Total: ₹${itemTotal}\n`;
    message += `Delivery Charge: ₹${deliveryCharge}\n`;
    if (totals.discount > 0) {
        message += `Discount (${totals.couponCode || 'APPLIED'}): -₹${totals.discount}\n`;
    }
    message += `*Grand Total: ₹${finalTotal}*\n`;
    message += `----------------\n`;

    if (userDetails.instructions) {
        message += `*Instructions:*\n`;
        message += `${userDetails.instructions}\n`;
    }

    if (totals.paymentQR || totals.upiId) {
        message += `\n💳 *Payment Details:*\n`;
        if (totals.upiId) {
            message += `UPI ID: ${totals.upiId}\n`;
        }
        if (totals.paymentQR) {
            message += `QR Code: ${totals.paymentQR}\n`;
        }
        message += `\n🛑Please share the payment screenshot here for confirmation.🛑`;
    }

    return encodeURIComponent(message);
};

// Fallback number used by laundry page
export const LAUNDRY_NUMBER = "919048086503";
