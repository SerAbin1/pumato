"use strict";

import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import type { DocumentData } from "firebase/firestore";

// Fake Firestore. `doc(db, col, id)` returns a path-tagged ref; `doc(collectionRef)`
// (the auto-id form) returns the pre-allocated order ref.
const mocks = vi.hoisted(() => ({
    doc: vi.fn(),
    collection: vi.fn(),
    updateDoc: vi.fn(),
    runTransaction: vi.fn(),
    onSnapshot: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: { __db: true } }));
vi.mock("firebase/firestore", () => ({
    doc: mocks.doc,
    collection: mocks.collection,
    updateDoc: mocks.updateDoc,
    runTransaction: mocks.runTransaction,
    onSnapshot: mocks.onSnapshot,
    // Query builders tag their arguments so tests can read back the constraints.
    query: (...args: unknown[]) => ({ __query: args }),
    where: (...args: unknown[]) => ({ where: args }),
    orderBy: (...args: unknown[]) => ({ orderBy: args }),
    limit: (n: number) => ({ limit: n }),
    Timestamp: { fromDate: (d: Date) => ({ __ts: d }) },
}));

const {
    createOrder,
    updateOrder,
    subscribeUserOrders,
    subscribePartnerOrders,
    subscribeAdminOrders,
    subscribeDeliveryOrders,
} = await import("@/lib/repositories/order");

type OrderInput = Parameters<typeof createOrder>[0];

const AUTO_ID = "auto-generated-id";

/**
 * Records every tx operation in call order so tests can assert both the payloads
 * and that the read precedes the writes (Firestore enforces this at runtime).
 */
type FakeRef = { path: string; id: string };
type SetOp = { op: "set"; ref: FakeRef; data: DocumentData; options?: unknown };
type Op = { op: "get"; ref: FakeRef } | SetOp;

function makeTransaction(counterData?: { last?: unknown }) {
    const ops: Op[] = [];
    return {
        ops,
        tx: {
            get: vi.fn(async (ref: FakeRef) => {
                ops.push({ op: "get", ref });
                return {
                    exists: () => counterData !== undefined,
                    data: () => counterData,
                };
            }),
            set: vi.fn((ref: FakeRef, data: DocumentData, options?: unknown) => {
                ops.push({ op: "set", ref, data, options });
            }),
        },
    };
}

/** Runs createOrder against a counter doc holding `counterData` (undefined = doc absent). */
async function runCreate(
    data: Parameters<typeof createOrder>[0] & Record<string, unknown>,
    counterData?: { last?: unknown }
) {
    const { ops, tx } = makeTransaction(counterData);
    mocks.runTransaction.mockImplementation(async (_db, fn) => fn(tx));
    const result = await createOrder(data);
    const sets = ops.filter((o): o is SetOp => o.op === "set");
    return {
        result,
        ops,
        counterSet: sets.find((o) => o.ref.path === "counters/orders")!,
        orderSet: sets.find((o) => o.ref.id === AUTO_ID)!,
    };
}

const validOrder = (): OrderInput => ({
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
        // @ts-expect-error: deliberately not an order status
        await expect(createOrder({ ...validOrder(), status: "teleported" })).rejects.toThrow();
        expect(mocks.runTransaction).not.toHaveBeenCalled();
    });

    it("rejects a missing required field before opening a transaction", async () => {
        const { phone: _phone, ...data } = validOrder();

        // @ts-expect-error: deliberately missing the required phone
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
        } as const;
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

/** A query snapshot doc whose `createdAt` (and any other Timestamp field) is a fake Timestamp. */
const snapDoc = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });
const ts = (iso: string) => ({ toDate: () => new Date(iso) });

/**
 * Captures the query and callbacks handed to onSnapshot, so a test can push
 * snapshots through them.
 */
function captureSnapshot() {
    let next: (snap: unknown) => void = () => {};
    let fail: (error: Error) => void = () => {};
    let q: { __query: unknown[] } | undefined;
    const unsubscribe = vi.fn();
    mocks.onSnapshot.mockImplementation((query, onNext, onError) => {
        q = query;
        next = onNext;
        fail = onError;
        return unsubscribe;
    });
    return {
        unsubscribe,
        constraints: () => q!.__query.slice(1),
        emit: (docs: ReturnType<typeof snapDoc>[], addedIds: string[] = []) =>
            next({
                docs,
                docChanges: () => addedIds.map((id) => ({ type: "added", doc: { id } })),
            }),
        fail: (error: Error) => fail(error),
    };
}

describe("order subscriptions", () => {
    it("attaches the id and reads createdAt as a Date", () => {
        const snap = captureSnapshot();
        const onChange = vi.fn();
        subscribeUserOrders("user-1", onChange, vi.fn());

        snap.emit([
            snapDoc("a", { status: "placed", createdAt: ts("2026-10-22T05:00:00Z") }),
            snapDoc("b", { status: "placed" }),
        ]);

        expect(onChange).toHaveBeenCalledWith([
            { id: "a", status: "placed", createdAt: new Date("2026-10-22T05:00:00Z") },
            { id: "b", status: "placed", createdAt: null },
        ]);
    });

    it("returns the unsubscribe and forwards listener errors", () => {
        const snap = captureSnapshot();
        const onError = vi.fn();
        const unsubscribe = subscribeAdminOrders("placed", vi.fn(), onError);

        const error = new Error("permission-denied");
        snap.fail(error);

        expect(unsubscribe).toBe(snap.unsubscribe);
        expect(onError).toHaveBeenCalledWith(error);
    });

    it("keeps only in-app orders on the partner direct list, scoped to the restaurant", () => {
        const snap = captureSnapshot();
        const onChange = vi.fn();
        subscribePartnerOrders("res-1", "direct", onChange, vi.fn());

        expect(snap.constraints()).toContainEqual({
            where: ["restaurantIds", "array-contains", "res-1"],
        });

        snap.emit([snapDoc("wa", { flow: "whatsapp" }), snapDoc("app", { flow: "direct" })]);

        expect(onChange.mock.calls[0][0].map((o: { id: string }) => o.id)).toEqual(["app"]);
    });

    it("drops in-app orders from the WhatsApp lists", () => {
        const snap = captureSnapshot();
        const onChange = vi.fn();
        subscribeAdminOrders("inProgress", onChange, vi.fn());

        snap.emit([snapDoc("wa", {}), snapDoc("app", { flow: "direct" })]);

        expect(onChange.mock.calls[0][0].map((o: { id: string }) => o.id)).toEqual(["wa"]);
    });

    it("reports added ids only for orders that made the list", () => {
        const snap = captureSnapshot();
        const onChange = vi.fn();
        subscribePartnerOrders("res-1", "live", onChange, vi.fn());

        snap.emit([snapDoc("wa", {}), snapDoc("app", { flow: "direct" })], ["wa", "app"]);

        expect(onChange.mock.calls[0][1]).toEqual(["wa"]);
    });

    it("reads readyAt as a Date on the delivery ready list", () => {
        const snap = captureSnapshot();
        const onChange = vi.fn();
        subscribeDeliveryOrders("rider-1", "ready", onChange, vi.fn());

        snap.emit([snapDoc("a", { readyAt: ts("2026-10-22T06:00:00Z") })]);

        expect(onChange.mock.calls[0][0][0].readyAt).toEqual(new Date("2026-10-22T06:00:00Z"));
    });

    it("scopes the delivery mine list to the partner", () => {
        const snap = captureSnapshot();
        subscribeDeliveryOrders("rider-1", "mine", vi.fn(), vi.fn());

        expect(snap.constraints()).toContainEqual({
            where: ["deliveryPartnerUid", "==", "rider-1"],
        });
    });
});
