import { formatDeliverySlot } from "@/lib/preOrderSlots";
import type { CartItem, UserDetails } from "@/lib/types";

export interface WhatsAppTotals {
    itemTotal: number;
    deliveryCharge: number;
    finalTotal: number;
    discount: number;
    couponCode?: string | null;
    orderNumber?: string;
    deliverySlot?: Parameters<typeof formatDeliverySlot>[0];
    paymentQR?: string;
    upiId?: string;
}

interface CustomLink {
    type: string;
    link: string;
}

/**
 * Formats user order details into a structured WhatsApp message string.
 * @returns URL encoded WhatsApp message string
 */
export const formatWhatsAppMessage = (
    cartItems: CartItem[],
    userDetails: Partial<UserDetails>,
    totals: WhatsAppTotals
): string => {
    const { name, phone, address, campus } = userDetails;
    const { itemTotal, deliveryCharge, finalTotal } = totals;

    let message = `*New Order from Pumato* 🍅\n\n`;
    if (totals.orderNumber) message += `*Order No: ${totals.orderNumber}*\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${name}\n`;
    message += `Phone: ${phone}\n`;
    message += `Hostel: ${address}\n\n`;
    if (campus) message += `*Campus: ${campus}*\n`;

    if (totals.deliverySlot) {
        message += `*Delivery Slot: ${formatDeliverySlot(totals.deliverySlot)}*\n`;
    }

    message += `*Order Details:*\n`;
    const groupedItems = cartItems.reduce<Record<string, CartItem[]>>((acc, item) => {
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
 * @returns URL encoded WhatsApp message string
 */
export const formatMarketplaceRequestMessage = (request: {
    itemName?: string;
    askingPrice?: number | string;
    campus?: string;
    description?: string;
    sellerName: string;
    sellerWhatsApp: string;
    customLinks?: CustomLink[];
}): string => {
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
 * @param willingPrice - the price the buyer is offering
 * @returns URL encoded WhatsApp message string
 */
export const formatMarketplaceOfferMessage = (
    listing: { itemName?: string; askingPrice?: number | string },
    willingPrice: number | string
): string => {
    let message = `Hi! I'm interested in your listing on Pumato Marketplace:\n\n`;
    message += `*${listing.itemName}*\n`;
    message += `Asking price: ₹${listing.askingPrice}\n`;
    message += `I'd like to offer: ₹${willingPrice}\n`;

    return encodeURIComponent(message);
};
