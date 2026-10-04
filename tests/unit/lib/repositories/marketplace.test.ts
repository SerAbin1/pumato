"use strict";

import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake Firestore. `doc(db, col, id)` returns a path-tagged ref.
const mocks = vi.hoisted(() => ({
    doc: vi.fn(),
    updateDoc: vi.fn(),
    addDoc: vi.fn(),
    collection: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: { __db: true } }));
vi.mock("firebase/firestore", () => ({
    doc: mocks.doc,
    updateDoc: mocks.updateDoc,
    addDoc: mocks.addDoc,
    collection: mocks.collection,
    serverTimestamp: () => "SERVER_TIMESTAMP",
}));

const { updateListing, updateMarketplaceRequest, createMarketplaceRequest } =
    await import("@/lib/repositories/marketplace");

beforeEach(() => {
    vi.clearAllMocks();
    mocks.doc.mockImplementation((_db, ...segments) => ({ path: segments.join("/") }));
    mocks.collection.mockImplementation((_db, path) => ({ path }));
    mocks.addDoc.mockResolvedValue({ id: "new-request" });
});

describe("updateListing", () => {
    it("writes only the fields supplied, leaving defaulted fields untouched", async () => {
        await updateListing("listing-1", { isVisible: false });

        expect(mocks.updateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ path: "marketplace_listings/listing-1" }),
            { isVisible: false }
        );
    });

    it("drops keys the listing schema does not define", async () => {
        await updateListing("listing-1", { isVisible: false, notAField: "x" });

        const [, written] = mocks.updateDoc.mock.calls[0];
        expect(written).toEqual({ isVisible: false });
    });

    it("re-derives the promotion tier when promotion is patched", async () => {
        await updateListing("listing-1", { promotion: { popup: { enabled: true } } });

        const [, written] = mocks.updateDoc.mock.calls[0];
        expect(Object.keys(written)).toEqual(["promotion"]);
        expect(written.promotion.tier).toBe("L3");
    });
});

describe("updateMarketplaceRequest", () => {
    it("writes only the fields supplied, leaving defaulted fields untouched", async () => {
        await updateMarketplaceRequest("request-1", { status: "handled" });

        expect(mocks.updateDoc).toHaveBeenCalledWith(
            expect.objectContaining({ path: "marketplace_requests/request-1" }),
            { status: "handled" }
        );
    });
});

describe("createMarketplaceRequest", () => {
    it("stamps createdAt itself, since the schema strips a caller-supplied one", async () => {
        const id = await createMarketplaceRequest({
            sellerName: "Asha",
            sellerWhatsApp: "919000000000",
            status: "pending",
        });

        expect(id).toBe("new-request");
        const [ref, written] = mocks.addDoc.mock.calls[0];
        expect(ref).toEqual({ path: "marketplace_requests" });
        expect(written.createdAt).toBe("SERVER_TIMESTAMP");
        expect(written.sellerName).toBe("Asha");
    });
});
