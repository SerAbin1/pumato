"use strict";

import { describe, it, expect } from "vitest";
import {
    calculateItemTotal,
    calculateDiscount,
    calculateMinOrderShortfalls,
} from "../../../lib/cartPricing";

// Helper builders
const single = (overrides = {}) => [{ id: "1", price: "100", quantity: 1, ...overrides }];

describe("calculateItemTotal", () => {
    it("uses unitPrice when present (variant/addons selected)", () => {
        const items = [
            { id: "1", price: "100", unitPrice: 200, quantity: 2 }, // 400
            { id: "2", price: "50", unitPrice: 50, quantity: 1 }, // 50
        ];
        expect(calculateItemTotal(items)).toBe(450);
    });

    it("falls back to price when unitPrice is missing (base item)", () => {
        const items = [{ id: "1", price: "100", quantity: 3 }];
        expect(calculateItemTotal(items)).toBe(300);
    });

    it("mixes unitPrice and fallback items in one cart", () => {
        const items = [
            { id: "1", price: "100", unitPrice: 200, quantity: 2 }, // 400
            { id: "2", price: "100", quantity: 1 }, // 100
        ];
        expect(calculateItemTotal(items)).toBe(500);
    });

    it("handles a zero base price with missing unitPrice", () => {
        const items = [{ id: "1", price: "0", quantity: 5 }];
        expect(calculateItemTotal(items)).toBe(0);
    });

    it("handles an explicit zero unitPrice", () => {
        const items = [{ id: "1", price: "100", unitPrice: 0, quantity: 3 }];
        expect(calculateItemTotal(items)).toBe(0);
    });

    it("returns 0 for an empty cart", () => {
        expect(calculateItemTotal([])).toBe(0);
    });

    it("returns 0 when quantity is 0", () => {
        const items = [{ id: "1", price: "100", unitPrice: 200, quantity: 0 }];
        expect(calculateItemTotal(items)).toBe(0);
    });
});

describe("calculateDiscount - no coupon / guards", () => {
    it("returns 0 when no coupon is active", () => {
        expect(calculateDiscount(null, 500, single())).toBe(0);
    });

    it("returns 0 when min order is not met", () => {
        const coupon = { type: "FLAT", value: "50", minOrder: "100" };
        expect(calculateDiscount(coupon, 50, single())).toBe(0);
    });

    it("returns 0 when targeted item is not in cart", () => {
        const coupon = { type: "FLAT", value: "50", itemId: "999" };
        expect(calculateDiscount(coupon, 500, single())).toBe(0);
    });
});

describe("calculateDiscount - global coupons", () => {
    it("applies global FLAT capped at item total", () => {
        const coupon = { type: "FLAT", value: "100" };
        expect(calculateDiscount(coupon, 500, single())).toBe(100);
    });

    it("caps global FLAT at item total", () => {
        const coupon = { type: "FLAT", value: "100" };
        expect(calculateDiscount(coupon, 50, single())).toBe(50);
    });

    it("applies global PERCENTAGE within cap", () => {
        const coupon = { type: "PERCENTAGE", value: "20" };
        expect(calculateDiscount(coupon, 500, single())).toBe(100);
    });

    it("caps global PERCENTAGE at 100", () => {
        const coupon = { type: "PERCENTAGE", value: "50" };
        expect(calculateDiscount(coupon, 1000, single())).toBe(100);
    });
});

describe("calculateDiscount - item-specific with unitPrice (variant/addons)", () => {
    it("applies FLAT to item with unitPrice, capped at item total", () => {
        const items = [
            { id: "biryani", price: "100", unitPrice: 200, quantity: 2 }, // 400
        ];
        const coupon = { type: "FLAT", value: "100", itemId: "biryani" };
        expect(calculateDiscount(coupon, 400, items)).toBe(100);
    });

    it("applies PERCENTAGE to item with unitPrice", () => {
        const items = [
            { id: "biryani", price: "100", unitPrice: 200, quantity: 2 }, // 400
        ];
        const coupon = { type: "PERCENTAGE", value: "20", itemId: "biryani" };
        expect(calculateDiscount(coupon, 400, items)).toBe(80);
    });

    it("applies BOGO to item with unitPrice", () => {
        const items = [{ id: "biryani", price: "100", unitPrice: 200, quantity: 3 }];
        const coupon = { type: "BOGO", value: "0", itemId: "biryani" };
        expect(calculateDiscount(coupon, 600, items)).toBe(200); // floor(3/2)*200
    });

    it("applies B2G1 to item with unitPrice", () => {
        const items = [{ id: "biryani", price: "100", unitPrice: 200, quantity: 5 }];
        const coupon = { type: "B2G1", value: "0", itemId: "biryani" };
        expect(calculateDiscount(coupon, 1000, items)).toBe(200); // floor(5/3)*200
    });

    it("applies addon-inflated unitPrice correctly (FLAT)", () => {
        const items = [
            { id: "biryani", price: "100", unitPrice: 300, quantity: 2 }, // 600 with addons
        ];
        const coupon = { type: "FLAT", value: "100", itemId: "biryani" };
        expect(calculateDiscount(coupon, 600, items)).toBe(100);
    });
});

describe("calculateDiscount - item-specific fallback and category", () => {
    it("applies FLAT to item without unitPrice (falls back to price)", () => {
        const items = [
            { id: "rice", price: "100", quantity: 2 }, // 200
        ];
        const coupon = { type: "FLAT", value: "50", itemId: "rice" };
        expect(calculateDiscount(coupon, 200, items)).toBe(50);
    });

    it("applies category coupon only to matching category items (with unitPrice)", () => {
        const items = [
            { id: "biryani", category: "BIRYANI", price: "100", unitPrice: 200, quantity: 2 }, // 400
            { id: "rice", category: "RICE", price: "100", quantity: 1 }, // 100
        ];
        const coupon = { type: "PERCENTAGE", value: "25", itemId: "CATEGORY:BIRYANI" };
        expect(calculateDiscount(coupon, 500, items)).toBe(100); // 25% of 400
    });

    it("mixes unitPrice and fallback items in the same targeted category", () => {
        const items = [
            { id: "b1", category: "BIRYANI", price: "100", unitPrice: 200, quantity: 1 }, // 200
            { id: "b2", category: "BIRYANI", price: "100", quantity: 2 }, // 200
        ];
        const coupon = { type: "FLAT", value: "150", itemId: "CATEGORY:BIRYANI" };
        expect(calculateDiscount(coupon, 400, items)).toBe(150); // capped at 400 total
    });
});

describe("calculateMinOrderShortfalls", () => {
    const restaurants = [
        { id: "r1", name: "Spice Hub", minOrderAmount: "300" },
        { id: "r2", name: "Noodle Box", minOrderAmount: "200" },
        { id: "r3", name: "No Min", minOrderAmount: "" },
    ];

    it("passes when variant (unitPrice) items meet the minimum", () => {
        const items = [
            { id: "1", price: "100", unitPrice: 200, quantity: 2, restaurantId: "r1" }, // 400
        ];
        expect(calculateMinOrderShortfalls(items, restaurants)).toHaveLength(0);
    });

    it("reports a shortfall when variant items fall below minimum", () => {
        const items = [
            { id: "1", price: "100", unitPrice: 100, quantity: 1, restaurantId: "r1" }, // 100
        ];
        const shortfalls = calculateMinOrderShortfalls(items, restaurants);
        expect(shortfalls).toHaveLength(1);
        expect(shortfalls[0]).toMatchObject({
            restaurantId: "r1",
            minAmount: 300,
            currentTotal: 100,
            shortfall: 200,
        });
    });

    it("falls back to base price when unitPrice is missing", () => {
        const items = [
            { id: "1", price: "100", quantity: 2, restaurantId: "r1" }, // 200
        ];
        const shortfalls = calculateMinOrderShortfalls(items, restaurants);
        expect(shortfalls).toHaveLength(1);
        expect(shortfalls[0].currentTotal).toBe(200);
        expect(shortfalls[0].shortfall).toBe(100);
    });

    it("aggregates mixed variant + base items at the same restaurant", () => {
        const items = [
            { id: "1", price: "100", unitPrice: 200, quantity: 1, restaurantId: "r1" }, // 200
            { id: "2", price: "100", quantity: 1, restaurantId: "r1" }, // 100
        ];
        expect(calculateMinOrderShortfalls(items, restaurants)).toHaveLength(0); // 300 >= 300
    });

    it("reports shortfalls per restaurant without double-counting", () => {
        const items = [
            { id: "1", price: "100", unitPrice: 100, quantity: 1, restaurantId: "r1" }, // 100 < 300
            { id: "2", price: "100", unitPrice: 100, quantity: 1, restaurantId: "r2" }, // 100 < 200
        ];
        const shortfalls = calculateMinOrderShortfalls(items, restaurants);
        expect(shortfalls).toHaveLength(2);
        const r1 = shortfalls.find((s) => s.restaurantId === "r1");
        const r2 = shortfalls.find((s) => s.restaurantId === "r2");
        expect(r1.shortfall).toBe(200);
        expect(r2.shortfall).toBe(100);
    });

    it("returns no shortfalls for a restaurant with no minimum set", () => {
        const items = [
            { id: "1", price: "100", quantity: 1, restaurantId: "r3" }, // 100
        ];
        expect(calculateMinOrderShortfalls(items, restaurants)).toHaveLength(0);
    });

    it("returns no shortfalls for an empty cart", () => {
        expect(calculateMinOrderShortfalls([], restaurants)).toHaveLength(0);
    });
});
