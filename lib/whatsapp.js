export const formatWhatsAppMessage = (cartItems, userDetails, totals) => {
    const { name, phone, address } = userDetails;
    const { itemTotal, deliveryCharge, finalTotal } = totals;

    let message = `*New Order from Pumato* 🍅\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${name}\n`;
    message += `Phone: ${phone}\n`;
    message += `Address: ${address}\n\n`;

    message += `*Order Details:*\n`;
    cartItems.forEach((item, index) => {
        message += `${index + 1}. ${item.name} x ${item.quantity} - ₹${item.price * item.quantity}\n`;
    });

    message += `\n----------------\n`;
    message += `Item Total: ₹${itemTotal}\n`;
    message += `Delivery Charge: ₹${deliveryCharge}\n`;
    if (totals.discount > 0) {
        message += `Discount (${totals.couponCode || 'APPLIED'}): -₹${totals.discount}\n`;
    }
    message += `*Grand Total: ₹${finalTotal}*\n`;
    message += `----------------\n`;

    return encodeURIComponent(message);
};

export const FOOD_DELIVERY_NUMBER = "919048086503";
export const LAUNDRY_NUMBER = "919048086503";
export const GROCERY_NUMBER = "919048086503";
