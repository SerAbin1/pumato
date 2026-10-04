"use strict";

import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake Firestore. `doc(db, col, id)` returns a path-tagged ref.
const mocks = vi.hoisted(() => ({
    doc: vi.fn(),
    updateDoc: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: { __db: true } }));
vi.mock("firebase/firestore", () => ({
    doc: mocks.doc,
    updateDoc: mocks.updateDoc,
}));

const { updateRestaurant } = await import("@/lib/repositories/restaurant");
const { updateLaundryOrder } = await import("@/lib/repositories/laundry");

beforeEach(() => {
    vi.clearAllMocks();
    mocks.doc.mockImplementation((_db, ...segments) => ({ path: segments.join("/") }));
});

describe("updateRestaurant", () => {
    it("writes only the fields supplied", async () => {
        await updateRestaurant("rest-1", { isVisible: false });

        expect(mocks.updateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ path: "restaurants/rest-1" }),
            { isVisible: false }
        );
    });
});

describe("updateLaundryOrder", () => {
    it("writes only the fields supplied", async () => {
        await updateLaundryOrder("laundry-1", { status: "DeliveryPending" });

        expect(mocks.updateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ path: "laundry_orders/laundry-1" }),
            { status: "DeliveryPending" }
        );
    });
});
