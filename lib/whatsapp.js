import { formatDeliverySlot } from "@/lib/preOrderSlots";

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
        message += `*Delivery Slot: ${formatDeliverySlot(totals.deliverySlot)}*\n`;
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
            const unitPrice =
                typeof item.unitPrice === "number" ? item.unitPrice : Number(item.price) || 0;
            let label = item.name;
            if (item.variant && item.variant.name) {
                label += ` (${item.variant.name})`;
            }
            if (item.addons && item.addons.length > 0) {
                label += ` + ${item.addons.map((a) => a.name).join(", ")}`;
            }
            message += `${index + 1}. ${label} x ${item.quantity} - ₹${unitPrice * item.quantity}\n`;
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
 * @param {Object} request - itemName, askingPrice, campus, description, sellerName, sellerWhatsApp
 * @returns {string} - URL encoded WhatsApp message string
 */
export const formatMarketplaceRequestMessage = (request) => {
    const { itemName, askingPrice, campus, description, sellerName, sellerWhatsApp, customLinks } =
        request;

    let message = `*New Marketplace Listing Request*\n\n`;
    if (itemName) message += `Item: ${itemName}\n`;
    if (askingPrice) message += `Asking Price: ₹${askingPrice}\n`;
    if (campus) message += `Campus: ${campus}\n\n`;
    if (description) {
        message += `Description:\n${description}\n\n`;
    }
    message += `Seller: ${sellerName}\n`;
    message += `Seller WhatsApp: ${sellerWhatsApp}\n`;

    if (customLinks && customLinks.length > 0) {
        message += `Links:\n`;
        customLinks.forEach((link, index) => {
            message += `${index + 1}. ${link.type}: ${link.link}\n`;
        });
    }

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
