"use strict";

import { describe, it, expect } from "vitest";
import { clampIndex, nextIndex, prevIndex, hasMultipleImages } from "../../../lib/imageGallery";

describe("clampIndex", () => {
    it("keeps an in-range index", () => {
        expect(clampIndex(1, 5)).toBe(1);
    });

    it("clamps above the range", () => {
        expect(clampIndex(9, 5)).toBe(4);
    });

    it("clamps below the range", () => {
        expect(clampIndex(-3, 5)).toBe(0);
    });

    it("truncates fractional indexes", () => {
        expect(clampIndex(2.7, 5)).toBe(2);
    });

    it("returns 0 for an empty gallery", () => {
        expect(clampIndex(3, 0)).toBe(0);
    });

    it("returns 0 for a non-finite index", () => {
        expect(clampIndex(NaN, 5)).toBe(0);
    });
});

describe("nextIndex", () => {
    it("advances by one", () => {
        expect(nextIndex(0, 3)).toBe(1);
    });

    it("wraps from the last image to the first", () => {
        expect(nextIndex(2, 3)).toBe(0);
    });

    it("stays put for a single image", () => {
        expect(nextIndex(0, 1)).toBe(0);
    });

    it("returns 0 for an empty gallery", () => {
        expect(nextIndex(0, 0)).toBe(0);
    });

    it("normalises an out-of-range index before advancing", () => {
        expect(nextIndex(99, 3)).toBe(0);
        expect(nextIndex(-5, 3)).toBe(1);
    });
});

describe("prevIndex", () => {
    it("goes back by one", () => {
        expect(prevIndex(2, 3)).toBe(1);
    });

    it("wraps from the first image to the last", () => {
        expect(prevIndex(0, 3)).toBe(2);
    });

    it("stays put for a single image", () => {
        expect(prevIndex(0, 1)).toBe(0);
    });

    it("returns 0 for an empty gallery", () => {
        expect(prevIndex(0, 0)).toBe(0);
    });
});

describe("hasMultipleImages", () => {
    it("is true for more than one image", () => {
        expect(hasMultipleImages(["a", "b"])).toBe(true);
    });

    it("is false for a single image", () => {
        expect(hasMultipleImages(["a"])).toBe(false);
    });

    it("is false for an empty or missing list", () => {
        expect(hasMultipleImages([])).toBe(false);
        expect(hasMultipleImages(undefined)).toBe(false);
    });
});
