"use strict";

import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake Firestore. `doc(db, col, id)` returns a path-tagged ref; `doc(collectionRef)`
// (the auto-id form) returns the pre-allocated order ref.
const mocks = vi.hoisted(() => ({
    doc: vi.fn(),
    collection: vi.fn(),
    updateDoc: vi.fn(),
    runTransaction: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: { __db: true } }));
vi.mock("firebase/firestore", () => ({
    doc: mocks.doc,
    collection: mocks.collection,
    updateDoc: mocks.updateDoc,
    runTransaction: mocks.runTransaction,
}));

const { createOrder, updateOrder } = await import("@/lib/repositories/order");

const AUTO_ID = "auto-generated-id";

/**
 * Records every tx operation in call order so tests can assert both the payloads
 * and that the read precedes the writes (Firestore enforces this at runtime).
 */
function makeTransaction(counterData) {
    const ops = [];
    return {
        ops,
        tx: {
            get: vi.fn(async (ref) => {
                ops.push({ op: "get", ref });
                return {
                    exists: () => counterData !== undefined,
                    data: () => counterData,
                };
            }),
            set: vi.fn((ref, data, options) => {
                ops.push({ op: "set", ref, data, options });
            }),
        },
    };
}

/** Runs createOrder against a counter doc holding `counterData` (undefined = doc absent). */
async function runCreate(data, counterData) {
    const { ops, tx } = makeTransaction(counterData);
    mocks.runTransaction.mockImplementation(async (_db, fn) => fn(tx));
    const result = await createOrder(data);
    const sets = ops.filter((o) => o.op === "set");
    return {
        result,
        ops,
        counterSet: sets.find((o) => o.ref.path === "counters/orders"),
        orderSet: sets.find((o) => o.ref.id === AUTO_ID),
    };
}

const validOrder = () => ({
    status: "placed",
    items: [
        {
            id: "item-1",
            name: "Chicken Biryani",
            price: 180,
            unitPrice: 180,
            quantity: 2,
            restaurantId: "res-1",
            restaurantName: "Hotel Ashiana",
            category: "Biryani",
        },
    ],
    restaurantIds: ["res-1"],
    name: "Test User",
    phone: "9876543210",
    campus: "PU",
    address: "Hostel 3",
    total: 360,
    deliveryCharge: 20,
    discount: 0,
    finalTotal: 380,
    createdAt: { __serverTimestamp: true },
});

beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockImplementation((_db, name) => ({ __collection: name }));
    mocks.doc.mockImplementation((...args) =>
        args.length === 1
            ? { id: AUTO_ID, path: `${args[0].__collection}/${AUTO_ID}` }
            : { id: args[args.length - 1], path: args.slice(1).join("/") }
    );
});

describe("createOrder — order number", () => {
    it("starts at ORD-0001 when the counter doc does not exist yet", async () => {
        const { result, counterSet, orderSet } = await runCreate(validOrder(), undefined);

        expect(result.orderNumber).toBe("ORD-0001");
        expect(orderSet.data.orderNumber).toBe("ORD-0001");
        expect(counterSet.data).toEqual({ last: 1 });
    });

    it("increments from the stored counter value", async () => {
        const { result, counterSet, orderSet } = await runCreate(validOrder(), { last: 422 });

        expect(result.orderNumber).toBe("ORD-0423");
        expect(orderSet.data.orderNumber).toBe("ORD-0423");
        expect(counterSet.data).toEqual({ last: 423 });
    });

    it("falls back to 0 when the counter doc is corrupt or missing `last`", async () => {
        for (const corrupt of [{}, { last: null }, { last: "nope" }]) {
            const { result, counterSet } = await runCreate(validOrder(), corrupt);
            expect(result.orderNumber).toBe("ORD-0001");
            expect(counterSet.data).toEqual({ last: 1 });
        }
    });

    it("returns both the doc id and the order number", async () => {
        const { result } = await runCreate(validOrder(), { last: 7 });
        expect(result).toEqual({ id: AUTO_ID, orderNumber: "ORD-0008" });
    });
});

describe("createOrder — transaction shape", () => {
    it("reads the counter before either write", async () => {
        const { ops } = await runCreate(validOrder(), { last: 1 });

        expect(ops.map((o) => o.op)).toEqual(["get", "set", "set"]);
        expect(ops[0].ref.path).toBe("counters/orders");
    });

    it("writes the counter with only `last` and no merge, as the security rule requires", async () => {
        const { counterSet } = await runCreate(validOrder(), { last: 5 });

        expect(Object.keys(counterSet.data)).toEqual(["last"]);
        expect(counterSet.options).toBeUndefined();
    });

    it("writes the order to a pre-allocated auto-id doc in the orders collection", async () => {
        const { orderSet } = await runCreate(validOrder(), { last: 1 });

        expect(mocks.collection).toHaveBeenCalledWith(expect.anything(), "orders");
        expect(orderSet.ref.path).toBe(`orders/${AUTO_ID}`);
    });

    it("propagates a transaction failure to the caller", async () => {
        mocks.runTransaction.mockRejectedValue(new Error("aborted"));

        await expect(createOrder(validOrder())).rejects.toThrow("aborted");
    });
});

describe("createOrder — validation", () => {
    it("persists the validated order payload", async () => {
        const data = validOrder();
        const { orderSet } = await runCreate(data, { last: 1 });

        expect(orderSet.data).toMatchObject({
            status: "placed",
            name: "Test User",
            phone: "9876543210",
            campus: "PU",
            address: "Hostel 3",
            restaurantIds: ["res-1"],
            total: 360,
            deliveryCharge: 20,
            discount: 0,
            finalTotal: 380,
            createdAt: data.createdAt,
        });
    });

    it("applies schema defaults and coercion to items", async () => {
        const data = validOrder();
        data.items[0].price = "180"; // strings arrive from the menu editor
        const { orderSet } = await runCreate(data, { last: 1 });

        expect(orderSet.data.items[0].price).toBe(180);
        expect(orderSet.data.items[0].isVeg).toBe(false);
    });

    it("strips unknown fields instead of persisting them", async () => {
        const { orderSet } = await runCreate({ ...validOrder(), sneaky: "x" }, { last: 1 });

        expect(orderSet.data).not.toHaveProperty("sneaky");
    });

    it("rejects an invalid status before opening a transaction", async () => {
        await expect(createOrder({ ...validOrder(), status: "teleported" })).rejects.toThrow();
        expect(mocks.runTransaction).not.toHaveBeenCalled();
    });

    it("rejects a missing required field before opening a transaction", async () => {
        const data = validOrder();
        delete data.phone;

        await expect(createOrder(data)).rejects.toThrow();
        expect(mocks.runTransaction).not.toHaveBeenCalled();
    });

    it("accepts a campus pre-order delivery slot", async () => {
        const deliverySlot = {
            source: "campus",
            date: "2026-08-30",
            start: "19:00",
            end: "20:00",
            cutoffMinutes: 60,
            campusId: "PU",
        };
        const { orderSet } = await runCreate({ ...validOrder(), deliverySlot }, { last: 1 });

        expect(orderSet.data.deliverySlot).toEqual(deliverySlot);
    });
});

describe("updateOrder", () => {
    it("writes only the fields supplied", async () => {
        await updateOrder("order-1", { status: "confirmed" });

        expect(mocks.updateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ path: "orders/order-1" }),
            { status: "confirmed" }
        );
    });

    it("rejects an invalid partial update", async () => {
        await expect(updateOrder("order-1", { status: "nonsense" })).rejects.toThrow();
        expect(mocks.updateDoc).not.toHaveBeenCalled();
    });
});
