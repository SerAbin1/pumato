"use strict";

import { describe, it, expect } from "vitest";
import { computeDiff, hasChanges } from "../../../lib/diff";

describe("computeDiff", () => {
    it("returns only the changed keys", () => {
        const baseline = { a: 1, b: 2, c: 3 };
        expect(computeDiff(baseline, { a: 1, b: 99, c: 3 })).toEqual({ b: 99 });
    });

    it("returns an empty object when nothing changed", () => {
        const baseline = { a: 1, b: [1, 2], c: { d: 3 } };
        expect(computeDiff(baseline, { a: 1, b: [1, 2], c: { d: 3 } })).toEqual({});
    });

    it("compares nested values structurally, not by reference", () => {
        const baseline = { campuses: [{ id: "PU", slots: [] }] };

        expect(computeDiff(baseline, { campuses: [{ id: "PU", slots: [] }] })).toEqual({});
        expect(
            computeDiff(baseline, { campuses: [{ id: "PU", slots: ["7:00 PM - 8:00 PM"] }] })
        ).toHaveProperty("campuses");
    });

    it("treats everything as changed when there is no baseline", () => {
        const current = { a: 1, b: 2 };
        expect(computeDiff(null, current)).toBe(current);
        expect(computeDiff(undefined, current)).toBe(current);
    });

    it("reports a key the baseline lacks", () => {
        expect(computeDiff({ a: 1 }, { a: 1, b: 2 })).toEqual({ b: 2 });
    });

    it("ignores keys absent from current — settings saves merge, not replace", () => {
        expect(computeDiff({ a: 1, b: 2 }, { a: 1 })).toEqual({});
    });

    it("does not conflate a field of one tab with a same-named field of another", () => {
        // Delivery and Global both write site_content/order_settings but own
        // disjoint keys; each diff must contain only its own.
        const deliveryBaseline = { baseDeliveryCharge: "10", minOrderAmount: "100" };
        const diff = computeDiff(deliveryBaseline, {
            baseDeliveryCharge: "20",
            minOrderAmount: "100",
        });

        expect(diff).toEqual({ baseDeliveryCharge: "20" });
        expect(diff).not.toHaveProperty("whatsappNumber");
    });

    it("detects a falsy-but-different value", () => {
        expect(computeDiff({ hidden: true }, { hidden: false })).toEqual({ hidden: false });
        expect(computeDiff({ note: "x" }, { note: "" })).toEqual({ note: "" });
    });
});

describe("hasChanges", () => {
    it("is false for an identical object", () => {
        expect(hasChanges({ a: 1 }, { a: 1 })).toBe(false);
    });

    it("is true once any key differs", () => {
        expect(hasChanges({ a: 1 }, { a: 2 })).toBe(true);
    });

    it("is true with no baseline and any content", () => {
        expect(hasChanges(null, { a: 1 })).toBe(true);
    });

    it("is false with no baseline and nothing to save", () => {
        expect(hasChanges(null, {})).toBe(false);
    });
});
