/**
 * Formats user order details into a structured WhatsApp message string.
 * @param {Array} cartItems - Array of items in the cart
 * @param {Object} userDetails - Object containing name, phone, address, etc.
 * @param {Object} totals - Object containing itemTotal, deliveryCharge, finalTotal, etc.
 * @returns {string} - URL encoded WhatsApp message string
 */
export const formatWhatsAppMessage = (cartItems, userDetails, totals) => {
    const { name, phone, address, campus } = userDetails;
    const { itemTotal, deliveryCharge, finalTotal } = totals;

    let message = `*New Order from Pumato* 🍅\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${name}\n`;
    message += `Phone: ${phone}\n`;
    message += `Hostel: ${address}\n\n`;
    if (campus) message += `*Campus: ${campus}*\n`;

    if (totals.deliverySlot) {
        message += `*Delivery Slot: ${totals.deliverySlot}*\n`;
    }

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
        message += `Discount (${totals.couponCode || "APPLIED"}): -₹${totals.discount}\n`;
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

/**
 * Formats a seller's marketplace listing request into a WhatsApp message for the admin.
 * @param {Object} request - itemName, askingPrice, category, campus, description, sellerName, sellerWhatsApp
 * @returns {string} - URL encoded WhatsApp message string
 */
export const formatMarketplaceRequestMessage = (request) => {
    const { itemName, askingPrice, category, campus, description, sellerName, sellerWhatsApp } =
        request;

    let message = `*New Marketplace Listing Request*\n\n`;
    message += `Item: ${itemName}\n`;
    message += `Asking Price: ₹${askingPrice}\n`;
    message += `Category: ${category}\n`;
    message += `Campus: ${campus}\n\n`;
    message += `Description:\n${description}\n\n`;
    message += `Seller: ${sellerName}\n`;
    message += `Seller WhatsApp: ${sellerWhatsApp}\n`;

    return encodeURIComponent(message);
};

/**
 * Formats a buyer's offer on a marketplace listing into a WhatsApp message for the seller.
 * @param {Object} listing - itemName, askingPrice
 * @param {number|string} willingPrice - the price the buyer is offering
 * @returns {string} - URL encoded WhatsApp message string
 */
export const formatMarketplaceOfferMessage = (listing, willingPrice) => {
    let message = `Hi! I'm interested in your listing on Pumato Marketplace:\n\n`;
    message += `*${listing.itemName}*\n`;
    message += `Asking price: ₹${listing.askingPrice}\n`;
    message += `I'd like to offer: ₹${willingPrice}\n`;

    return encodeURIComponent(message);
};
