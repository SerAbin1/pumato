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
    deriveTier,
    normalizePromotion,
} from "../../../lib/marketplacePromotions";
import type { InFeedPromotion, PopupPromotion } from "../../../lib/marketplacePromotions";
import { MarketplaceListingSchema } from "../../../lib/schemas/marketplace";

const TODAY = "2026-10-03";

const listing = (
    id: string,
    {
        inFeed = {},
        popup = {},
        ...rest
    }: {
        inFeed?: Partial<InFeedPromotion>;
        popup?: Partial<PopupPromotion>;
        targetCampuses?: string[];
    } = {},
    extra: Record<string, unknown> = {}
) => ({
    id,
    isVisible: true,
    expiryDate: "",
    promotion: {
        inFeed: { enabled: true, reach: 100, surfaces: ["restaurant_menu"], ...inFeed },
        popup: { enabled: false, reach: 100, ...popup },
        ...rest,
    },
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
        placement: "inFeed" as const,
        surface: "restaurant_menu",
        campus: "PU",
        visitorId: "v1",
        todayStr: TODAY,
    };

    it("filters by placement, surface, campus and liveness", () => {
        const listings = [
            listing("ok"),
            listing("popup-only", { inFeed: { enabled: false }, popup: { enabled: true } }),
            listing("other-surface", { inFeed: { surfaces: ["restaurant_list"] } }),
            listing("other-campus", { targetCampuses: ["XYZ"] }),
            listing("hidden", {}, { isVisible: false }),
            listing("expired", {}, { expiryDate: "2026-10-02" }),
            listing("no-promo", {}, { promotion: undefined }),
        ];
        expect(selectPromotions(listings, opts).map((l) => l.id)).toEqual(["ok"]);
    });

    it("lets one listing be both in-feed and a popup", () => {
        const listings = [listing("both", { popup: { enabled: true } })];
        expect(selectPromotions(listings, opts)).toHaveLength(1);
        expect(
            selectPromotions(listings, { ...opts, placement: "popup", surface: undefined })
        ).toHaveLength(1);
    });

    it("nests the smaller placement audience inside the larger one", () => {
        const both = listing("both", {
            inFeed: { reach: 75 },
            popup: { enabled: true, reach: 25 },
        });
        for (let i = 0; i < 500; i++) {
            const o = { ...opts, visitorId: `v${i}` };
            const seesPopup =
                selectPromotions([both], { ...o, placement: "popup", surface: undefined }).length >
                0;
            const seesFeed = selectPromotions([both], o).length > 0;
            if (seesPopup) expect(seesFeed).toBe(true);
        }
    });

    it("reads listings saved with the old single-tier shape", () => {
        const legacy = {
            id: "old",
            isVisible: true,
            expiryDate: "",
            promotion: { tier: "L2", reach: 100, surfaces: ["restaurant_menu"] },
        };
        expect(selectPromotions([legacy], opts)).toHaveLength(1);
        expect(
            selectPromotions([legacy], { ...opts, placement: "popup", surface: undefined })
        ).toHaveLength(0);
    });
});

describe("deriveTier", () => {
    it("labels by the most aggressive placement", () => {
        expect(deriveTier(normalizePromotion())).toBe("L1");
        expect(deriveTier({ inFeed: { enabled: true } })).toBe("L2");
        expect(deriveTier({ popup: { enabled: true } })).toBe("L3");
        expect(deriveTier({ inFeed: { enabled: true }, popup: { enabled: true } })).toBe("L3");
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

    it("fills promotion defaults and derives the tier", () => {
        const parsed = MarketplaceListingSchema.parse({
            ...base,
            promotion: { popup: { enabled: true, reach: 25 } },
        });
        expect(parsed.promotion).toEqual({
            inFeed: { enabled: false, reach: 100, surfaces: [] },
            popup: { enabled: true, reach: 25, cooldownHours: 24 },
            targetCampuses: [],
            tier: "L3",
        });
    });

    it("rejects out-of-range reach and unknown surfaces", () => {
        expect(() =>
            MarketplaceListingSchema.parse({ ...base, promotion: { popup: { reach: 150 } } })
        ).toThrow();
        expect(() =>
            MarketplaceListingSchema.parse({
                ...base,
                promotion: { inFeed: { surfaces: ["nowhere"] } },
            })
        ).toThrow();
    });
});
