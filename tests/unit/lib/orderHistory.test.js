"use strict";

import { describe, it, expect } from "vitest";
import {
    partitionOrders,
    isActiveOrder,
    getRecentlyOrderedItems,
    customerStatusLabel,
    totalSpent,
} from "../../../lib/orderHistory";

const item = (overrides = {}) => ({
    id: "biryani",
    name: "Chicken Biryani",
    price: 180,
    unitPrice: 180,
    quantity: 1,
    restaurantId: "res-1",
    restaurantName: "Hotel Ashiana",
    category: "Biryani",
    ...overrides,
});

const order = (overrides = {}) => ({
    id: "order-1",
    status: "delivered",
    finalTotal: 200,
    createdAt: new Date("2026-08-30T12:00:00Z"),
    items: [item()],
    ...overrides,
});

describe("isActiveOrder / partitionOrders", () => {
    it("treats delivered and cancelled as finished", () => {
        expect(isActiveOrder(order({ status: "delivered" }))).toBe(false);
        expect(isActiveOrder(order({ status: "cancelled" }))).toBe(false);
    });

    it("treats everything still in the pipeline as active", () => {
        for (const status of [
            "placed",
            "confirmed",
            "viewed",
            "ready_for_delivery",
            "out_of_stock",
            "oos_acknowledged",
            "picked_up",
        ]) {
            expect(isActiveOrder(order({ status }))).toBe(true);
        }
    });

    it("splits history into active and past, preserving order", () => {
        const orders = [
            order({ id: "a", status: "picked_up" }),
            order({ id: "b", status: "delivered" }),
            order({ id: "c", status: "placed" }),
            order({ id: "d", status: "cancelled" }),
        ];
        const { active, past } = partitionOrders(orders);

        expect(active.map((o) => o.id)).toEqual(["a", "c"]);
        expect(past.map((o) => o.id)).toEqual(["b", "d"]);
    });

    it("handles no orders", () => {
        expect(partitionOrders()).toEqual({ active: [], past: [] });
        expect(partitionOrders([])).toEqual({ active: [], past: [] });
    });
});

describe("getRecentlyOrderedItems", () => {
    it("returns distinct items, most recently ordered first", () => {
        const orders = [
            order({ id: "new", items: [item({ id: "naan", name: "Butter Naan" })] }),
            order({ id: "old", items: [item()] }),
        ];

        expect(getRecentlyOrderedItems(orders).map((i) => i.id)).toEqual(["naan", "biryani"]);
    });

    it("collapses repeats and counts them", () => {
        const orders = [order({ id: "a" }), order({ id: "b" }), order({ id: "c" })];
        const result = getRecentlyOrderedItems(orders);

        expect(result).toHaveLength(1);
        expect(result[0].timesOrdered).toBe(3);
    });

    it("keeps the most recent sighting's details", () => {
        // Orders arrive newest first, so the first one wins.
        const orders = [
            order({ id: "new", createdAt: new Date("2026-08-30T00:00:00Z") }),
            order({
                id: "old",
                createdAt: new Date("2026-01-01T00:00:00Z"),
                items: [item({ unitPrice: 100 })],
            }),
        ];

        expect(getRecentlyOrderedItems(orders)[0].price).toBe(180);
        expect(getRecentlyOrderedItems(orders)[0].lastOrderedAt).toEqual(
            new Date("2026-08-30T00:00:00Z")
        );
    });

    it("treats the same dish at different restaurants as different items", () => {
        const orders = [
            order({
                items: [item(), item({ restaurantId: "res-2", restaurantName: "Other Place" })],
            }),
        ];

        expect(getRecentlyOrderedItems(orders)).toHaveLength(2);
    });

    it("treats variants of one dish as the same item", () => {
        // "Order again" should point at the dish, not at the half plate.
        const orders = [
            order({
                items: [
                    item({ variant: { id: "half", name: "Half", price: 100 } }),
                    item({ variant: { id: "full", name: "Full", price: 180 } }),
                ],
            }),
        ];

        expect(getRecentlyOrderedItems(orders)).toHaveLength(1);
    });

    it("excludes cancelled orders", () => {
        // A cancelled order isn't evidence of a preference.
        const orders = [
            order({ status: "cancelled", items: [item({ id: "ghost", name: "Never Arrived" })] }),
            order({ status: "delivered" }),
        ];

        expect(getRecentlyOrderedItems(orders).map((i) => i.id)).toEqual(["biryani"]);
    });

    it("still counts orders that are in flight", () => {
        const orders = [order({ status: "picked_up" })];

        expect(getRecentlyOrderedItems(orders)).toHaveLength(1);
    });

    it("respects the limit", () => {
        const orders = [
            order({
                items: Array.from({ length: 20 }, (_, i) => item({ id: `item-${i}` })),
            }),
        ];

        expect(getRecentlyOrderedItems(orders)).toHaveLength(12); // default
        expect(getRecentlyOrderedItems(orders, { limit: 3 })).toHaveLength(3);
    });

    it("falls back to price when unitPrice is absent", () => {
        const orders = [order({ items: [{ ...item(), unitPrice: undefined, price: 150 }] })];

        expect(getRecentlyOrderedItems(orders)[0].price).toBe(150);
    });

    it("survives malformed data", () => {
        expect(getRecentlyOrderedItems()).toEqual([]);
        expect(getRecentlyOrderedItems([])).toEqual([]);
        expect(getRecentlyOrderedItems([{ status: "delivered" }])).toEqual([]);
        expect(getRecentlyOrderedItems([order({ items: [{}] })])).toEqual([]);
    });
});

describe("customerStatusLabel", () => {
    it("translates internal states into customer wording", () => {
        expect(customerStatusLabel("viewed")).toBe("Being prepared");
        expect(customerStatusLabel("picked_up")).toBe("On the way");
        expect(customerStatusLabel("ready_for_delivery")).toBe("Ready");
    });

    it("falls back rather than showing a raw enum", () => {
        expect(customerStatusLabel("something_new")).toBe("Placed");
        expect(customerStatusLabel(undefined)).toBe("Placed");
    });
});

describe("totalSpent", () => {
    it("counts only delivered orders", () => {
        const orders = [
            order({ status: "delivered", finalTotal: 200 }),
            order({ status: "cancelled", finalTotal: 500 }),
            order({ status: "picked_up", finalTotal: 300 }),
        ];

        expect(totalSpent(orders)).toBe(200);
    });

    it("is zero with nothing delivered", () => {
        expect(totalSpent([])).toBe(0);
        expect(totalSpent()).toBe(0);
        expect(totalSpent([order({ status: "placed" })])).toBe(0);
    });
});
