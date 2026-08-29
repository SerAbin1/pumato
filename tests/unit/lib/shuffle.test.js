"use strict";

import { describe, it, expect } from "vitest";
import { seededShuffle } from "../../../lib/shuffle";

describe("seededShuffle", () => {
    it("returns same-length array", () => {
        const arr = [1, 2, 3, 4, 5];
        expect(seededShuffle(arr, 1)).toHaveLength(arr.length);
    });

    it("contains all original elements", () => {
        const arr = [1, 2, 3, 4, 5];
        const result = seededShuffle(arr, 42);
        expect(result.sort()).toEqual(arr.sort());
    });

    it("does not mutate the original array", () => {
        const arr = [1, 2, 3, 4, 5];
        const copy = [...arr];
        seededShuffle(arr, 7);
        expect(arr).toEqual(copy);
    });

    it("produces the same order for the same seed", () => {
        const arr = ["a", "b", "c", "d", "e", "f"];
        const a = seededShuffle(arr, 10);
        const b = seededShuffle(arr, 10);
        expect(a).toEqual(b);
    });

    it("produces different orders for different seeds", () => {
        const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const a = seededShuffle(arr, 1);
        const b = seededShuffle(arr, 2);
        expect(a).not.toEqual(b);
    });

    it("handles empty array", () => {
        expect(seededShuffle([], 5)).toEqual([]);
    });

    it("handles single-element array", () => {
        expect(seededShuffle([42], 3)).toEqual([42]);
    });
});
