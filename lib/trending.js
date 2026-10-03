/**
 * Trending items are ranked server-side (functions/trending.js) from orders
 * customers can't read — weekly, or when an admin refreshes. The stored
 * entries are only ids; price, name and availability always come from the
 * live restaurant documents.
 */

/** Below this many items a "trending" row looks empty rather than popular. */
export const TRENDING_MIN_ITEMS = 3;

export const TRENDING_CACHE_KEY = "pumato_trending";
// The ranking changes weekly (or on a rare admin refresh), so a day-old copy
// is fine and saves a read on every /delivery visit.
export const TRENDING_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Trending entries from localStorage when fetched within the last day,
 * otherwise from `fetcher` (then cached). Storage failures — private mode,
 * quota, corrupt JSON — just fall through to a fetch.
 *
 * @param {Function} fetcher - async () => `site_content/trending` data or null
 * @param {Object} [options]
 * @param {Storage} [options.storage]
 * @param {number} [options.now]
 * @returns {Promise<Array>} entries
 */
export async function loadTrendingEntries(
    fetcher,
    { storage = globalThis.localStorage, now = Date.now() } = {}
) {
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
 * @param {Array} entries - `site_content/trending.items`
 * @param {Array} restaurants - Restaurants currently shown (open ones only)
 * @param {Object} [options]
 * @param {number} [options.limit]
 * @returns {Array} live menu items with `restaurantId`, `restaurantName` and
 *   `needsChoice`; unavailable items, and items from restaurants that have
 *   stopped being featured since the last ranking, are dropped
 */
export function resolveTrending(entries = [], restaurants = [], { limit = 8 } = {}) {
    const byId = new Map(restaurants.map((r) => [r.id, r]));
    const resolved = [];

    for (const entry of entries) {
        const restaurant = byId.get(entry?.restaurantId);
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
            needsChoice: Boolean(item.variants?.length || item.addons?.length),
        });
        if (resolved.length >= limit) break;
    }

    return resolved;
}
