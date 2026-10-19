"use strict";

import { describe, it, expect } from "vite-plus/test";
import { allowsSteamIron, estimateLaundry } from "../../../../app/laundry/estimate";
import type { LaundryItemDraft } from "../../../../app/laundry/types";
import type { LaundryPricing } from "../../../../lib/types";

const item = (overrides: Partial<LaundryItemDraft> = {}): LaundryItemDraft => ({
    id: 1,
    name: "Shirt",
    quantity: "1",
    categoryId: "",
    steamIron: false,
    ...overrides,
});

const pricing: LaundryPricing = {
    steamIronPrice: "15",
    categories: [
        { id: "wash", name: "Wash & Fold", pricePerKg: "60", steamIronEnabled: true },
        { id: "dry", name: "Dry Clean", pricePerKg: "150", steamIronEnabled: false },
        { id: "draft", name: "  ", pricePerKg: "999", steamIronEnabled: true },
    ],
};

describe("estimateLaundry", () => {
    it("is empty until an item has a wash type", () => {
        const est = estimateLaundry([item({ steamIron: true })], pricing, {});
        expect(est).toEqual({ lines: [], steamIronCount: 0, steamIronAmount: 0, total: 0 });
    });

    it("defaults each wash type's weight", () => {
        const est = estimateLaundry([item({ categoryId: "wash" })], pricing, {});
        expect(est.lines).toEqual([
            { key: "wash", label: "Wash & Fold", pricePerKg: 60, weight: 5, amount: 300 },
        ]);
    });

    it("prices each wash type in use by its own weight", () => {
        const est = estimateLaundry(
            [item({ categoryId: "wash" }), item({ id: 2, categoryId: "dry" })],
            pricing,
            { wash: 3, dry: 1.5 }
        );
        expect(est.lines.map((l) => [l.key, l.amount])).toEqual([
            ["wash", 180],
            ["dry", 225],
        ]);
        expect(est.total).toBe(405);
    });

    it("leaves out unused and unnamed wash types", () => {
        const est = estimateLaundry([item({ categoryId: "wash" })], pricing, {});
        expect(est.lines.map((l) => l.key)).toEqual(["wash"]);
    });

    it("only charges steam ironing on wash types that allow it", () => {
        const est = estimateLaundry(
            [
                item({ categoryId: "wash", steamIron: true, quantity: "2" }),
                item({ id: 2, categoryId: "dry", steamIron: true, quantity: "4" }),
            ],
            pricing,
            { wash: 1, dry: 1 }
        );
        expect(est.steamIronCount).toBe(2);
        expect(est.steamIronAmount).toBe(30);
    });
});

describe("allowsSteamIron", () => {
    it("follows the category flag, and denies an unselected type", () => {
        const cats = pricing.categories;
        expect(allowsSteamIron(cats, "wash")).toBe(true);
        expect(allowsSteamIron(cats, "dry")).toBe(false);
        expect(allowsSteamIron(cats, "")).toBe(false);
    });
});
