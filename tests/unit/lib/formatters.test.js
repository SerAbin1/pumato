"use strict";

import { describe, it, expect } from "vitest";
import { formatOrderNumber, displayOrderNumber } from "../../../lib/formatters";

describe("formatOrderNumber", () => {
    it("pads the first order to 4 digits", () => {
        expect(formatOrderNumber(1)).toBe("ORD-0001");
    });

    it("pads mid-range values", () => {
        expect(formatOrderNumber(423)).toBe("ORD-0423");
        expect(formatOrderNumber(9999)).toBe("ORD-9999");
    });

    it("rolls past 9999 without truncating", () => {
        expect(formatOrderNumber(10000)).toBe("ORD-10000");
        expect(formatOrderNumber(123456)).toBe("ORD-123456");
    });
});

describe("displayOrderNumber", () => {
    it("prefers the stored order number", () => {
        expect(displayOrderNumber({ orderNumber: "ORD-0423", id: "abc123def" })).toBe("ORD-0423");
    });

    it("falls back to the short doc id for legacy orders", () => {
        expect(displayOrderNumber({ id: "xyza1b2c3" })).toBe("#A1B2C3");
    });

    it("returns an empty string when there is nothing to show", () => {
        expect(displayOrderNumber({})).toBe("");
        expect(displayOrderNumber(null)).toBe("");
        expect(displayOrderNumber(undefined)).toBe("");
    });
});
