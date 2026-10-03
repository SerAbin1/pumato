"use strict";

import { describe, it, expect, vi } from "vitest";
import {
    resolveTrending,
    loadTrendingEntries,
    TRENDING_CACHE_KEY,
    TRENDING_CACHE_TTL_MS,
} from "../../../lib/trending";
import trending from "../../../functions/trending";

const { computeTrending, lastWeekWindow } = trending;

const line = (id, overrides = {}) => ({
    id,
    name: id,
    quantity: 1,
    restaurantId: "res-1",
    restaurantName: "Hotel Ashiana",
    ...overrides,
});

const featuredIds = new Set(["res-1", "res-2"]);
const ids = (entries) => entries.map((e) => e.itemId);

describe("computeTrending", () => {
    it("ranks by distinct orders, using quantity only to break ties", () => {
        const orders = [
            { status: "delivered", items: [line("chapati", { quantity: 40 })] },
            { status: "delivered", items: [line("biryani")] },
            { status: "delivered", items: [line("biryani"), line("lime", { quantity: 3 })] },
            { status: "delivered", items: [line("lime")] },
        ];
        expect(ids(computeTrending(orders, { featuredIds }))).toEqual([
            "lime",
            "biryani",
            "chapati",
        ]);
    });

    it("stores only the ids needed to find the item", () => {
        const orders = [{ status: "delivered", items: [line("biryani")] }];
        expect(computeTrending(orders, { featuredIds })).toEqual([
            { restaurantId: "res-1", itemId: "biryani" },
        ]);
    });

    it("only counts items from featured restaurants", () => {
        const orders = [
            {
                status: "delivered",
                items: [line("biryani"), line("dosa", { restaurantId: "not-featured" })],
            },
        ];
        expect(ids(computeTrending(orders, { featuredIds }))).toEqual(["biryani"]);
    });

    it("counts an item once per order even when it appears on several lines", () => {
        const orders = [
            { status: "delivered", items: [line("pizza", { quantity: 2 })] },
            { status: "delivered", items: [line("garlic"), line("garlic")] },
            { status: "delivered", items: [line("garlic")] },
        ];
        // garlic: 2 orders; pizza: 1 order despite its higher single-order qty.
        expect(ids(computeTrending(orders, { featuredIds }))).toEqual(["garlic", "pizza"]);
    });

    it("ignores undelivered orders and items without ids", () => {
        const orders = [
            { status: "cancelled", items: [line("biryani")] },
            { status: "placed", items: [line("biryani")] },
            { status: "delivered", items: [{ name: "legacy", restaurantId: "res-1" }] },
        ];
        expect(computeTrending(orders, { featuredIds })).toEqual([]);
    });

    it("keys items per restaurant", () => {
        const orders = [
            {
                status: "delivered",
                items: [line("biryani"), line("biryani", { restaurantId: "res-2" })],
            },
        ];
        expect(computeTrending(orders, { featuredIds })).toHaveLength(2);
    });

    it("respects the limit", () => {
        const orders = [{ status: "delivered", items: ["a", "b", "c"].map((id) => line(id)) }];
        expect(computeTrending(orders, { featuredIds, limit: 2 })).toHaveLength(2);
    });
});

describe("lastWeekWindow", () => {
    // IST is UTC+5:30, so IST midnight is 18:30 UTC the previous day.
    const mondayMidnight = "2026-09-27T18:30:00.000Z"; // Mon 28 Sep 00:00 IST
    const sundayMidnight = "2026-10-03T18:30:00.000Z"; // Sun 4 Oct 00:00 IST

    it("covers Monday 00:00 to Sunday 00:00 IST of the last complete week", () => {
        const { start, end } = lastWeekWindow(new Date("2026-10-04T00:30:00Z")); // Sun 06:00 IST
        expect(start.toISOString()).toBe(mondayMidnight);
        expect(end.toISOString()).toBe(sundayMidnight);
    });

    it("still ranks last week when refreshed mid-week", () => {
        const { start, end } = lastWeekWindow(new Date("2026-10-07T09:00:00Z")); // Wed IST
        expect(start.toISOString()).toBe(mondayMidnight);
        expect(end.toISOString()).toBe(sundayMidnight);
    });

    it("treats Saturday late night IST as part of the week still in progress", () => {
        // Sat 3 Oct 23:30 IST — that week isn't complete, so rank the one before.
        const { end } = lastWeekWindow(new Date("2026-10-03T18:00:00Z"));
        expect(end.toISOString()).toBe("2026-09-26T18:30:00.000Z");
    });
});

describe("resolveTrending", () => {
    const restaurant = (overrides = {}) => ({
        id: "res-1",
        name: "Hotel Ashiana",
        isFeatured: true,
        menu: [
            { id: "biryani", name: "Chicken Biryani", price: "200", category: "Rice" },
            { id: "lime", name: "Lime Soda", price: "40", category: "Drinks" },
            {
                id: "pizza",
                name: "Pizza",
                price: "199",
                category: "Pizza",
                variants: [{ id: "v1", name: "Large", price: "349" }],
            },
        ],
        ...overrides,
    });
    const entries = [
        { restaurantId: "res-1", itemId: "biryani" },
        { restaurantId: "res-1", itemId: "lime" },
        { restaurantId: "res-1", itemId: "pizza" },
    ];

    it("returns live menu items in trending order", () => {
        const result = resolveTrending(entries, [restaurant()]);
        expect(result.map((i) => i.id)).toEqual(["biryani", "lime", "pizza"]);
        expect(result[0]).toMatchObject({
            price: "200",
            restaurantName: "Hotel Ashiana",
            needsChoice: false,
        });
        expect(result[2].needsChoice).toBe(true);
    });

    it("drops restaurants that are closed, missing, or no longer featured", () => {
        expect(resolveTrending(entries, [restaurant({ isVisible: false })])).toEqual([]);
        expect(resolveTrending(entries, [restaurant({ isFeatured: false })])).toEqual([]);
        expect(resolveTrending(entries, [])).toEqual([]);
    });

    it("drops hidden, deleted and category-out-of-stock items", () => {
        const r = restaurant({ outOfStockCategories: ["Drinks"] });
        r.menu[0].isVisible = false;
        r.menu.pop();
        expect(resolveTrending(entries, [r])).toEqual([]);
    });

    it("respects the limit", () => {
        expect(resolveTrending(entries, [restaurant()], { limit: 1 })).toHaveLength(1);
    });
});

describe("loadTrendingEntries", () => {
    const memoryStorage = (initial = {}) => {
        const data = { ...initial };
        return {
            getItem: (k) => (k in data ? data[k] : null),
            setItem: (k, v) => {
                data[k] = String(v);
            },
            data,
        };
    };
    const items = [{ restaurantId: "res-1", itemId: "biryani" }];
    const NOW = 1_000_000_000_000;

    it("fetches and caches when nothing is cached", async () => {
        const storage = memoryStorage();
        const fetcher = vi.fn().mockResolvedValue({ items });

        expect(await loadTrendingEntries(fetcher, { storage, now: NOW })).toEqual(items);
        expect(fetcher).toHaveBeenCalledOnce();
        expect(JSON.parse(storage.data[TRENDING_CACHE_KEY])).toEqual({ items, fetchedAt: NOW });
    });

    it("serves the cache without fetching for a day", async () => {
        const storage = memoryStorage();
        const fetcher = vi.fn().mockResolvedValue({ items });
        await loadTrendingEntries(fetcher, { storage, now: NOW });

        const later = NOW + TRENDING_CACHE_TTL_MS - 1;
        expect(await loadTrendingEntries(fetcher, { storage, now: later })).toEqual(items);
        expect(fetcher).toHaveBeenCalledOnce();
    });

    it("refetches once the cache is a day old", async () => {
        const storage = memoryStorage();
        const fetcher = vi.fn().mockResolvedValue({ items });
        await loadTrendingEntries(fetcher, { storage, now: NOW });
        await loadTrendingEntries(fetcher, { storage, now: NOW + TRENDING_CACHE_TTL_MS });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("caches an empty or missing trending doc too", async () => {
        const storage = memoryStorage();
        const fetcher = vi.fn().mockResolvedValue(null);
        expect(await loadTrendingEntries(fetcher, { storage, now: NOW })).toEqual([]);
        await loadTrendingEntries(fetcher, { storage, now: NOW + 1 });
        expect(fetcher).toHaveBeenCalledOnce();
    });

    it("falls back to fetching when storage is corrupt or unavailable", async () => {
        const fetcher = vi.fn().mockResolvedValue({ items });
        const corrupt = memoryStorage({ [TRENDING_CACHE_KEY]: "{not json" });
        const throwing = {
            getItem: () => {
                throw new Error("SecurityError");
            },
            setItem: () => {
                throw new Error("QuotaExceeded");
            },
        };

        expect(await loadTrendingEntries(fetcher, { storage: corrupt, now: NOW })).toEqual(items);
        expect(await loadTrendingEntries(fetcher, { storage: throwing, now: NOW })).toEqual(items);
        expect(await loadTrendingEntries(fetcher, { storage: undefined, now: NOW })).toEqual(items);
    });
});
