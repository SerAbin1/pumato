"use strict";

import { describe, it, expect } from "vitest";
import {
    hashToBucket,
    isInReach,
    matchesCampus,
    selectPromotions,
    planInsertions,
    isInCooldown,
    isListingLive,
} from "../../../lib/marketplacePromotions";
import { MarketplaceListingSchema } from "../../../lib/schemas/marketplace";

const TODAY = "2026-10-03";

const listing = (id, promotion = {}, extra = {}) => ({
    id,
    isVisible: true,
    expiryDate: "",
    promotion: { tier: "L2", reach: 100, surfaces: ["restaurant_menu"], ...promotion },
    ...extra,
});

describe("hashToBucket", () => {
    it("is stable and within 0-99", () => {
        expect(hashToBucket("abc")).toBe(hashToBucket("abc"));
        for (let i = 0; i < 200; i++) {
            const b = hashToBucket(`v${i}`);
            expect(b).toBeGreaterThanOrEqual(0);
            expect(b).toBeLessThan(100);
        }
    });
});

describe("isInReach", () => {
    it("always includes at 100% and excludes at 0%", () => {
        expect(isInReach("l1", "v1", 100)).toBe(true);
        expect(isInReach("l1", null, 100)).toBe(true);
        expect(isInReach("l1", "v1", 0)).toBe(false);
    });

    it("roughly matches the reach percentage across visitors", () => {
        const visitors = Array.from({ length: 2000 }, (_, i) => `visitor-${i}`);
        const share = visitors.filter((v) => isInReach("listing-x", v, 50)).length / 2000;
        expect(share).toBeGreaterThan(0.45);
        expect(share).toBeLessThan(0.55);
    });

    it("gives the same visitor the same answer every time", () => {
        const first = isInReach("l1", "v42", 25);
        for (let i = 0; i < 5; i++) expect(isInReach("l1", "v42", 25)).toBe(first);
    });
});

describe("matchesCampus", () => {
    it("treats empty targets as all campuses", () => {
        expect(matchesCampus([], "PU")).toBe(true);
        expect(matchesCampus([], "")).toBe(true);
    });

    it("requires a matching campus when targeted", () => {
        expect(matchesCampus(["PU"], "PU")).toBe(true);
        expect(matchesCampus(["PU"], "OTHER")).toBe(false);
        expect(matchesCampus(["PU"], "")).toBe(false);
    });
});

describe("selectPromotions", () => {
    const opts = {
        tier: "L2",
        surface: "restaurant_menu",
        campus: "PU",
        visitorId: "v1",
        todayStr: TODAY,
    };

    it("filters by tier, surface, campus and liveness", () => {
        const listings = [
            listing("ok"),
            listing("popup", { tier: "L3" }),
            listing("other-surface", { surfaces: ["restaurant_list"] }),
            listing("other-campus", { targetCampuses: ["XYZ"] }),
            listing("hidden", {}, { isVisible: false }),
            listing("expired", {}, { expiryDate: "2026-10-02" }),
            listing("no-promo", {}, { promotion: undefined }),
        ];
        expect(selectPromotions(listings, opts).map((l) => l.id)).toEqual(["ok"]);
    });

    it("ignores surface for popups", () => {
        const listings = [listing("p", { tier: "L3", surfaces: [] })];
        expect(
            selectPromotions(listings, { ...opts, tier: "L3", surface: undefined })
        ).toHaveLength(1);
    });
});

describe("planInsertions", () => {
    const ids = Array.from({ length: 20 }, (_, i) => `i${i}`);

    it("places promos after the first-th item then every Nth", () => {
        const plan = planInsertions(ids, ["a", "b", "c"], { first: 3, every: 8 });
        expect([...plan.entries()]).toEqual([
            ["i2", "a"],
            ["i10", "b"],
            ["i18", "c"],
        ]);
    });

    it("never repeats a promo and skips lists that are too short", () => {
        expect(planInsertions(ids, ["a"]).size).toBe(1);
        expect(planInsertions(["i0", "i1"], ["a"]).size).toBe(0);
    });
});

describe("isInCooldown", () => {
    const now = Date.UTC(2026, 9, 3, 12);
    const hour = 60 * 60 * 1000;

    it("is false when never dismissed", () => {
        expect(isInCooldown(undefined, 24, now)).toBe(false);
    });

    it("holds for the cooldown window then releases", () => {
        expect(isInCooldown(now - 23 * hour, 24, now)).toBe(true);
        expect(isInCooldown(now - 25 * hour, 24, now)).toBe(false);
    });
});

describe("isListingLive", () => {
    it("respects visibility and expiry", () => {
        expect(isListingLive({ isVisible: true, expiryDate: "" }, TODAY)).toBe(true);
        expect(isListingLive({ isVisible: false }, TODAY)).toBe(false);
        expect(isListingLive({ expiryDate: TODAY }, TODAY)).toBe(true);
        expect(isListingLive({ expiryDate: "2026-10-01" }, TODAY)).toBe(false);
    });
});

describe("MarketplaceListingSchema promotion", () => {
    const base = {
        id: "l1",
        sellerName: "A",
        sellerWhatsApp: "91",
        images: [],
        isVisible: true,
        expiryDate: "",
        createdAt: 0,
    };

    it("leaves listings without a promotion untouched", () => {
        expect(MarketplaceListingSchema.parse(base).promotion).toBeUndefined();
    });

    it("fills promotion defaults", () => {
        const parsed = MarketplaceListingSchema.parse({ ...base, promotion: { tier: "L3" } });
        expect(parsed.promotion).toEqual({
            tier: "L3",
            reach: 100,
            surfaces: [],
            targetCampuses: [],
            cooldownHours: 24,
        });
    });

    it("rejects unknown tiers and out-of-range reach", () => {
        expect(() =>
            MarketplaceListingSchema.parse({ ...base, promotion: { tier: "L9" } })
        ).toThrow();
        expect(() =>
            MarketplaceListingSchema.parse({ ...base, promotion: { tier: "L2", reach: 150 } })
        ).toThrow();
    });
});
