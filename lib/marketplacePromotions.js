/**
 * Marketplace listing promotions. A listing can be promoted in two independent ways:
 *
 * - inFeed: a sponsored card in-between items on the chosen surfaces
 * - popup:  a popup that interrupts the flow until dismissed
 *
 * Each has its own `reach`, the % of visitors that see it. A visitor is either in
 * or out of a listing's audience for good (hashed from a persistent visitor id),
 * so 50% means half the visitors see it every time, not everyone half the time.
 *
 * `tier` is a derived label (L1 = not promoted, L2 = in-feed only, L3 = popup)
 * stored alongside so Firestore can query promoted listings and admins can scan them.
 */

export const PLACEMENTS = ["inFeed", "popup"];

export const REACH_PRESETS = [25, 50, 75, 100];

export const PROMOTION_SURFACES = [
    { id: "restaurant_menu", label: "Restaurant menu" },
    { id: "restaurant_list", label: "Restaurant list" },
];

export const DEFAULT_POPUP_COOLDOWN_HOURS = 24;

export const DEFAULT_PROMOTION = {
    inFeed: {
        enabled: false,
        reach: 100,
        surfaces: PROMOTION_SURFACES.map((s) => s.id),
    },
    popup: {
        enabled: false,
        reach: 100,
        cooldownHours: DEFAULT_POPUP_COOLDOWN_HOURS,
    },
    targetCampuses: [],
};

export function deriveTier(promotion) {
    if (promotion?.popup?.enabled) return "L3";
    if (promotion?.inFeed?.enabled) return "L2";
    return "L1";
}

/** Fills defaults, and reads listings saved with the earlier single-tier shape. */
export function normalizePromotion(promotion) {
    const p = promotion || {};
    if (!p.inFeed && !p.popup && p.tier) {
        return {
            inFeed: {
                ...DEFAULT_PROMOTION.inFeed,
                enabled: p.tier === "L2",
                reach: p.reach ?? 100,
                ...(p.surfaces && { surfaces: p.surfaces }),
            },
            popup: {
                ...DEFAULT_PROMOTION.popup,
                enabled: p.tier === "L3",
                reach: p.reach ?? 100,
                cooldownHours: p.cooldownHours ?? DEFAULT_POPUP_COOLDOWN_HOURS,
            },
            targetCampuses: p.targetCampuses ?? [],
        };
    }
    return {
        inFeed: { ...DEFAULT_PROMOTION.inFeed, ...p.inFeed },
        popup: { ...DEFAULT_PROMOTION.popup, ...p.popup },
        targetCampuses: p.targetCampuses ?? [],
    };
}

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
 * Promoted listings this visitor should see in one placement.
 * @param {{ placement: "inFeed"|"popup", surface?: string, campus?: string, visitorId?: string, todayStr?: string }} opts
 */
export function selectPromotions(listings, { placement, surface, campus, visitorId, todayStr }) {
    return listings.filter((listing) => {
        const promo = normalizePromotion(listing.promotion);
        const config = promo[placement];
        if (!config.enabled) return false;
        if (!isListingLive(listing, todayStr)) return false;
        if (surface && !config.surfaces?.includes(surface)) return false;
        if (!matchesCampus(promo.targetCampuses, campus)) return false;
        // Same bucket for both placements, so the smaller audience nests inside the larger
        return isInReach(listing.id, visitorId, config.reach);
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
