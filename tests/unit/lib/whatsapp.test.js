"use strict";

import { describe, it, expect } from "vitest";
import {
    formatWhatsAppMessage,
    formatMarketplaceRequestMessage,
    formatMarketplaceOfferMessage,
} from "../../../lib/whatsapp";

describe("formatMarketplaceRequestMessage", () => {
    const request = {
        itemName: "Study Table",
        askingPrice: 1500,
        category: "Furniture",
        campus: "PU",
        description: "Barely used, no scratches",
        sellerName: "Ravi Kumar",
        sellerWhatsApp: "9198765432",
    };

    it("encodes all request fields into the message", () => {
        const decoded = decodeURIComponent(formatMarketplaceRequestMessage(request));
        expect(decoded).toContain("Study Table");
        expect(decoded).toContain("₹1500");
        expect(decoded).toContain("Furniture");
        expect(decoded).toContain("PU");
        expect(decoded).toContain("Barely used, no scratches");
        expect(decoded).toContain("Ravi Kumar");
        expect(decoded).toContain("9198765432");
    });

    it("returns a URL-encoded string", () => {
        const message = formatMarketplaceRequestMessage(request);
        expect(message).not.toContain("\n");
        expect(message).toBe(encodeURIComponent(decodeURIComponent(message)));
    });
});

describe("formatMarketplaceOfferMessage", () => {
    const listing = { itemName: "Bicycle", askingPrice: 3000 };

    it("includes the item name, asking price, and the buyer's willing price", () => {
        const decoded = decodeURIComponent(formatMarketplaceOfferMessage(listing, 2500));
        expect(decoded).toContain("Bicycle");
        expect(decoded).toContain("₹3000");
        expect(decoded).toContain("₹2500");
    });

    it("reflects an edited willing price different from the asking price", () => {
        const decoded = decodeURIComponent(formatMarketplaceOfferMessage(listing, 1000));
        expect(decoded).toContain("I'd like to offer: ₹1000");
        expect(decoded).not.toContain("I'd like to offer: ₹3000");
    });
});

describe("formatWhatsAppMessage with variants and addons", () => {
    const userDetails = { name: "A", phone: "B", address: "C" };
    const totals = { itemTotal: 570, deliveryCharge: 30, finalTotal: 600 };

    it("includes variant and addon names in the item line", () => {
        const cartItems = [
            {
                name: "Chicken Biryani",
                quantity: 2,
                price: 220,
                unitPrice: 285,
                variant: { id: "v1", name: "Full", price: 220 },
                addons: [{ id: "a1", name: "Raita", price: 65 }],
                restaurantName: "Spice Hub",
            },
        ];
        const decoded = decodeURIComponent(formatWhatsAppMessage(cartItems, userDetails, totals));
        expect(decoded).toContain("Chicken Biryani (Full) + Raita");
        expect(decoded).toContain("x 2 - ₹570");
    });

    it("falls back to base price when no unitPrice is present", () => {
        const cartItems = [
            {
                name: "Plain Rice",
                quantity: 1,
                price: 80,
                restaurantName: "Spice Hub",
            },
        ];
        const decoded = decodeURIComponent(formatWhatsAppMessage(cartItems, userDetails, totals));
        expect(decoded).toContain("Plain Rice x 1 - ₹80");
    });
});
