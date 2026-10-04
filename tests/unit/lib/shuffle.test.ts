"use strict";

import { describe, it, expect } from "vitest";
import { seededShuffle, shuffleRestaurants } from "../../../lib/shuffle";

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

describe("shuffleRestaurants", () => {
    type R = { id: string; isFeatured?: boolean };
    const featured: R[] = ["f1", "f2", "f3", "f4"].map((id) => ({ id, isFeatured: true }));
    const others: R[] = ["o1", "o2", "o3", "o4", "o5"].map((id) => ({ id }));
    const all = [
        others[0],
        featured[0],
        others[1],
        featured[1],
        others[2],
        featured[2],
        others[3],
        featured[3],
        others[4],
    ];

    it("puts all featured restaurants before non-featured ones", () => {
        const result = shuffleRestaurants(all, 123);
        expect(result.slice(0, 4).every((r) => r.isFeatured)).toBe(true);
        expect(result.slice(4).every((r) => !r.isFeatured)).toBe(true);
    });

    it("keeps every restaurant", () => {
        const ids = shuffleRestaurants(all, 9)
            .map((r) => r.id)
            .sort();
        expect(ids).toEqual(all.map((r) => r.id).sort());
    });

    it("is deterministic for the same seed", () => {
        expect(shuffleRestaurants(all, 55)).toEqual(shuffleRestaurants(all, 55));
    });

    it("shuffles within each group across seeds", () => {
        const orders = new Set(
            [1, 2, 3, 4, 5].map((s) =>
                shuffleRestaurants(all, s)
                    .map((r) => r.id)
                    .join()
            )
        );
        expect(orders.size).toBeGreaterThan(1);
    });

    it("treats only isFeatured === true as featured", () => {
        const list = [{ id: "a", isFeatured: false }, { id: "b" }, { id: "c", isFeatured: true }];
        expect(shuffleRestaurants(list, 3)[0].id).toBe("c");
    });
});
