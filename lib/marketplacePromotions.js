/**
 * Marketplace listing promotion tiers.
 *
 * - L1: plain listing, only on /marketplace
 * - L2: also shown as a sponsored card in-between items on the chosen surfaces
 * - L3: also shown as a popup that interrupts the flow until dismissed
 *
 * `reach` is the % of visitors that see an L2/L3 listing. A visitor is either in
 * or out of a listing's audience for good (hashed from a persistent visitor id),
 * so 50% means half the visitors see it every time, not everyone half the time.
 */

export const PROMOTION_TIERS = [
    { id: "L1", label: "Listing only", description: "Appears on the Marketplace page only." },
    { id: "L2", label: "In-feed", description: "Also appears in-between items while browsing." },
    { id: "L3", label: "Popup", description: "Also pops up until the user dismisses it." },
];

export const REACH_PRESETS = [25, 50, 75, 100];

export const PROMOTION_SURFACES = [
    { id: "restaurant_menu", label: "Restaurant menu" },
    { id: "restaurant_list", label: "Restaurant list (Delivery page)" },
];

export const DEFAULT_POPUP_COOLDOWN_HOURS = 24;

export const DEFAULT_PROMOTION = {
    tier: "L1",
    reach: 100,
    surfaces: PROMOTION_SURFACES.map((s) => s.id),
    targetCampuses: [],
    cooldownHours: DEFAULT_POPUP_COOLDOWN_HOURS,
};

export function isListingLive(listing, todayStr = new Date().toISOString().slice(0, 10)) {
    if (listing.isVisible === false) return false;
    if (!listing.expiryDate) return true;
    return listing.expiryDate >= todayStr;
}

// FNV-1a: tiny, stable across browsers, and spreads ids evenly over 0-99.
export function hashToBucket(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 100;
}

export function isInReach(listingId, visitorId, reach) {
    if (reach >= 100) return true;
    if (!visitorId || reach <= 0) return false;
    return hashToBucket(`${visitorId}:${listingId}`) < reach;
}

/** Empty targetCampuses means every campus. A visitor with no campus only sees untargeted promos. */
export function matchesCampus(targetCampuses, campus) {
    if (!targetCampuses?.length) return true;
    return Boolean(campus) && targetCampuses.includes(campus);
}

/**
 * Promoted listings this visitor should see for a tier (and, for L2, a surface).
 * @param {{ tier: "L2"|"L3", surface?: string, campus?: string, visitorId?: string, todayStr?: string }} opts
 */
export function selectPromotions(listings, { tier, surface, campus, visitorId, todayStr }) {
    return listings.filter((listing) => {
        const promo = { ...DEFAULT_PROMOTION, ...listing.promotion };
        if (promo.tier !== tier) return false;
        if (!isListingLive(listing, todayStr)) return false;
        if (surface && !promo.surfaces.includes(surface)) return false;
        if (!matchesCampus(promo.targetCampuses, campus)) return false;
        return isInReach(listing.id, visitorId, promo.reach);
    });
}

/**
 * Decides which items get a sponsored card rendered right after them.
 * Each promo is used at most once; leftover slots stay empty.
 * @returns {Map<string, object>} item id -> promo listing
 */
export function planInsertions(itemIds, promos, { first = 3, every = 8 } = {}) {
    const plan = new Map();
    let next = 0;
    for (let i = first - 1; i < itemIds.length && next < promos.length; i += every) {
        plan.set(itemIds[i], promos[next++]);
    }
    return plan;
}

export function isInCooldown(dismissedAt, cooldownHours, now = Date.now()) {
    if (!dismissedAt) return false;
    return now - dismissedAt < cooldownHours * 60 * 60 * 1000;
}
