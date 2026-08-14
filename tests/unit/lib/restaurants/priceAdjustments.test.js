"use strict";

import { describe, it, expect } from "vitest";
import {
    PRICE_CHANGE_FIXED,
    PRICE_CHANGE_PERCENT,
    applyPriceChange,
    reversePriceChange,
    getAffectedItemsCount,
    isItemAffected,
} from "../../../../lib/restaurants/priceAdjustments";

const item = (id, price, category = "Starters") => ({ id, price, category });

const menu = [
    item("1", "100", "Starters"),
    item("2", "200", "Starters"),
    item("3", "300", "Main Course"),
];

describe("applyPriceChange - fixed", () => {
    it("increases each price by the fixed amount", () => {
        const updated = applyPriceChange(menu, {
            mode: PRICE_CHANGE_FIXED,
            value: 15,
        });
        expect(updated.map((i) => i.price)).toEqual(["115", "215", "315"]);
    });

    it("decreases each price by a negative fixed amount", () => {
        const updated = applyPriceChange(menu, {
            mode: PRICE_CHANGE_FIXED,
            value: -15,
        });
        expect(updated.map((i) => i.price)).toEqual(["85", "185", "285"]);
    });

    it("clamps price at 0 when the decrease exceeds the price", () => {
        const updated = applyPriceChange([item("1", "10")], {
            mode: PRICE_CHANGE_FIXED,
            value: -15,
        });
        expect(updated[0].price).toBe("0");
    });

    it("treats a missing price as 0", () => {
        const updated = applyPriceChange([item("1", "")], {
            mode: PRICE_CHANGE_FIXED,
            value: 10,
        });
        expect(updated[0].price).toBe("10");
    });
});

describe("applyPriceChange - percent", () => {
    it("increases each price by a percentage", () => {
        const updated = applyPriceChange(menu, {
            mode: PRICE_CHANGE_PERCENT,
            value: 10,
        });
        expect(updated.map((i) => i.price)).toEqual(["110", "220", "330"]);
    });

    it("decreases each price by a negative percentage", () => {
        const updated = applyPriceChange(menu, {
            mode: PRICE_CHANGE_PERCENT,
            value: -5,
        });
        expect(updated.map((i) => i.price)).toEqual(["95", "190", "285"]);
    });

    it("rounds to the nearest integer", () => {
        const updated = applyPriceChange([item("1", "149")], {
            mode: PRICE_CHANGE_PERCENT,
            value: -5,
        });
        expect(updated[0].price).toBe("142"); // 141.55 -> 142

        const raised = applyPriceChange([item("2", "97")], {
            mode: PRICE_CHANGE_PERCENT,
            value: 10,
        });
        expect(raised[0].price).toBe("107"); // 106.7 -> 107
    });

    it("clamps price at 0 when the percentage is -100 or below", () => {
        const updated = applyPriceChange([item("1", "100")], {
            mode: PRICE_CHANGE_PERCENT,
            value: -100,
        });
        expect(updated[0].price).toBe("0");
    });

    it("leaves prices unchanged for a 0% change", () => {
        const updated = applyPriceChange(menu, {
            mode: PRICE_CHANGE_PERCENT,
            value: 0,
        });
        expect(updated.map((i) => i.price)).toEqual(["100", "200", "300"]);
    });
});

describe("applyPriceChange - exclusions", () => {
    it("leaves excluded categories untouched", () => {
        const updated = applyPriceChange(menu, {
            mode: PRICE_CHANGE_FIXED,
            value: 10,
            excludedCategories: ["Main Course"],
        });
        expect(updated.map((i) => i.price)).toEqual(["110", "210", "300"]);
    });

    it("leaves excluded items untouched", () => {
        const updated = applyPriceChange(menu, {
            mode: PRICE_CHANGE_PERCENT,
            value: 10,
            excludedItemIds: ["2"],
        });
        expect(updated.map((i) => i.price)).toEqual(["110", "200", "330"]);
    });

    it("leaves light and heavy items untouched", () => {
        const menuWithTypes = [item("1", "100"), item("2", "200"), item("3", "300")];
        const updated = applyPriceChange(menuWithTypes, {
            mode: PRICE_CHANGE_PERCENT,
            value: 10,
            excludedLightItemIds: ["1"],
            excludedHeavyItemIds: ["3"],
        });
        expect(updated.map((i) => i.price)).toEqual(["100", "220", "300"]);
    });

    it("returns a new array without mutating the input", () => {
        const original = JSON.stringify(menu);
        const updated = applyPriceChange(menu, {
            mode: PRICE_CHANGE_FIXED,
            value: 5,
        });
        expect(updated).not.toBe(menu);
        expect(JSON.stringify(menu)).toBe(original);
    });
});

describe("getAffectedItemsCount", () => {
    it("counts all items when nothing is excluded", () => {
        expect(getAffectedItemsCount(menu, {})).toBe(3);
    });

    it("counts items after category exclusions", () => {
        expect(getAffectedItemsCount(menu, { excludedCategories: ["Main Course"] })).toBe(2);
    });

    it("counts items after item and light/heavy exclusions", () => {
        expect(
            getAffectedItemsCount(menu, {
                excludedItemIds: ["1"],
                excludedLightItemIds: ["2"],
                excludedHeavyItemIds: ["3"],
            })
        ).toBe(0);
    });

    it("returns 0 for an empty menu", () => {
        expect(getAffectedItemsCount([], {})).toBe(0);
    });
});

describe("isItemAffected", () => {
    it("matches the exclusion criteria", () => {
        expect(isItemAffected(item("1", "100"))).toBe(true);
        expect(isItemAffected(item("1", "100"), { excludedItemIds: ["1"] })).toBe(false);
        expect(isItemAffected(item("1", "100"), { excludedCategories: ["Starters"] })).toBe(false);
        expect(isItemAffected(item("1", "100"), { excludedLightItemIds: ["1"] })).toBe(false);
        expect(isItemAffected(item("1", "100"), { excludedHeavyItemIds: ["1"] })).toBe(false);
    });
});

describe("reversePriceChange", () => {
    it("reverses a fixed increase", () => {
        const applied = applyPriceChange([item("1", "100")], {
            mode: PRICE_CHANGE_FIXED,
            value: 15,
        });
        const reversed = reversePriceChange(applied, {
            mode: PRICE_CHANGE_FIXED,
            value: 15,
        });
        expect(reversed[0].price).toBe("100");
    });

    it("reverses a fixed decrease", () => {
        const applied = applyPriceChange([item("1", "100")], {
            mode: PRICE_CHANGE_FIXED,
            value: -15,
        });
        const reversed = reversePriceChange(applied, {
            mode: PRICE_CHANGE_FIXED,
            value: -15,
        });
        expect(reversed[0].price).toBe("100");
    });

    it("reverses a percentage increase", () => {
        const applied = applyPriceChange([item("1", "97")], {
            mode: PRICE_CHANGE_PERCENT,
            value: 10,
        });
        const reversed = reversePriceChange(applied, {
            mode: PRICE_CHANGE_PERCENT,
            value: 10,
        });
        expect(reversed[0].price).toBe("97");
    });

    it("reverses a percentage decrease", () => {
        const applied = applyPriceChange([item("1", "149")], {
            mode: PRICE_CHANGE_PERCENT,
            value: -5,
        });
        const reversed = reversePriceChange(applied, {
            mode: PRICE_CHANGE_PERCENT,
            value: -5,
        });
        expect(reversed[0].price).toBe("149");
    });
});
