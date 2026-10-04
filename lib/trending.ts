import type { MenuItem, Restaurant } from "@/lib/types";

export type TrendingRestaurant = Pick<Restaurant, "id" | "name"> &
    Partial<Pick<Restaurant, "menu" | "outOfStockCategories" | "isVisible" | "isFeatured">>;

export type TrendingItem = MenuItem & {
    restaurantId: string;
    restaurantName: string;
    orderCount?: number;
    needsChoice: boolean;
};

/**
 * Trending items are ranked server-side (functions/trending.js) from orders
 * customers can't read — weekly, or when an admin refreshes. The stored
 * entries are only ids; price, name and availability always come from the
 * live restaurant documents.
 */

/** Below this many items a "trending" row looks empty rather than popular. */
export const TRENDING_MIN_ITEMS = 3;

/** One ranked item in `site_content/trending.items`. */
export interface TrendingEntry {
    restaurantId: string;
    itemId: string;
    name?: string;
    /** Absent on rankings stored before counts were recorded. */
    orders?: number;
}

export interface TrendingDoc {
    items?: TrendingEntry[];
    [key: string]: unknown;
}

export const TRENDING_CACHE_KEY = "pumato_trending";
// The ranking changes weekly (or on a rare admin refresh), so a day-old copy
// is fine and saves a read on every /delivery visit.
export const TRENDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Trending entries from localStorage when fetched within the last day,
 * otherwise from `fetcher` (then cached). Storage failures — private mode,
 * quota, corrupt JSON — just fall through to a fetch.
 *
 * @param fetcher - async () => `site_content/trending` data or null
 */
export async function loadTrendingEntries(
    fetcher: () => Promise<TrendingDoc | null | undefined>,
    {
        storage = globalThis.localStorage,
        now = Date.now(),
    }: { storage?: Pick<Storage, "getItem" | "setItem"> | null; now?: number } = {}
): Promise<TrendingEntry[]> {
    try {
        const cached = JSON.parse(storage?.getItem(TRENDING_CACHE_KEY) || "null");
        if (Array.isArray(cached?.items) && now - cached.fetchedAt < TRENDING_CACHE_TTL_MS) {
            return cached.items;
        }
    } catch {
        // Unreadable cache — fetch instead.
    }

    const items = (await fetcher())?.items || [];
    try {
        storage?.setItem(TRENDING_CACHE_KEY, JSON.stringify({ items, fetchedAt: now }));
    } catch {
        // Not cached; we'll just fetch again next visit.
    }
    return items;
}

/**
 * @param entries - `site_content/trending.items`
 * @param restaurants - Restaurants currently shown (open ones only)
 * @returns live menu items with `restaurantId`, `restaurantName` and
 *   `needsChoice`; unavailable items, and items from restaurants that have
 *   stopped being featured since the last ranking, are dropped
 */
export function resolveTrending(
    entries: (TrendingEntry | null | undefined)[] = [],
    restaurants: TrendingRestaurant[] = [],
    { limit = 8 }: { limit?: number } = {}
): TrendingItem[] {
    const byId = new Map(restaurants.map((r) => [r.id, r]));
    const resolved: TrendingItem[] = [];

    for (const entry of entries) {
        if (!entry) continue;
        const restaurant = byId.get(entry.restaurantId);
        if (!restaurant || restaurant.isVisible === false || restaurant.isFeatured !== true) {
            continue;
        }

        const item = restaurant.menu?.find((m) => m.id === entry.itemId);
        if (!item || item.isVisible === false) continue;
        if ((restaurant.outOfStockCategories || []).includes(item.category)) continue;

        resolved.push({
            ...item,
            restaurantId: restaurant.id,
            restaurantName: restaurant.name,
            // Absent on rankings stored before counts were recorded.
            orderCount: entry.orders,
            needsChoice: Boolean(item.variants?.length || item.addons?.length),
        });
        if (resolved.length >= limit) break;
    }

    return resolved;
}
