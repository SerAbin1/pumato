"use strict";

import { describe, it, expect } from "vitest";
import { searchItemOptions } from "../../../../lib/restaurants/menuItem";

const pizza = {
    id: "pz1",
    name: "Margherita",
    price: "199",
    variants: [
        { id: "v1", name: "Regular", price: "199" },
        { id: "v2", name: "Large", price: "349" },
    ],
    addons: [
        { id: "a1", name: "Extra Cheese", price: "40" },
        { id: "a2", name: "Olives", price: "30" },
    ],
};

describe("searchItemOptions", () => {
    it("returns everything for an empty or blank query", () => {
        for (const q of ["", "   "]) {
            const result = searchItemOptions(pizza, q);
            expect(result.base).toBe(true);
            expect(result.variants).toHaveLength(2);
            expect(result.addons).toHaveLength(2);
            expect(result.empty).toBe(false);
        }
    });

    it("filters variants and addons by name, tolerating typos", () => {
        const result = searchItemOptions(pizza, "chese");
        expect(result.addons.map((a) => a.id)).toEqual(["a1"]);
        expect(result.variants).toHaveLength(0);
        expect(result.base).toBe(false);
    });

    it("matches the base option against the item's own name", () => {
        expect(searchItemOptions(pizza, "marg").base).toBe(true);
    });

    it("reports when nothing matches", () => {
        expect(searchItemOptions(pizza, "zzzz").empty).toBe(true);
    });

    it("has no base option to match when the item has no variants", () => {
        expect(searchItemOptions({ name: "Dosa" }, "dosa")).toEqual({
            base: false,
            variants: [],
            addons: [],
            empty: true,
        });
    });
});
