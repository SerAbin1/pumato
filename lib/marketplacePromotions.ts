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

export const PLACEMENTS = ["inFeed", "popup"] as const;
export type Placement = (typeof PLACEMENTS)[number];

export const REACH_PRESETS = [25, 50, 75, 100];

export const PROMOTION_SURFACES = [
    { id: "restaurant_menu", label: "Restaurant menu" },
    { id: "restaurant_list", label: "Restaurant list" },
] as const;
export type PromotionSurface = (typeof PROMOTION_SURFACES)[number]["id"];

export type Tier = "L1" | "L2" | "L3";

export interface InFeedPromotion {
    enabled: boolean;
    reach: number;
    surfaces: string[];
}

export interface PopupPromotion {
    enabled: boolean;
    reach: number;
    cooldownHours: number;
}

export interface Promotion {
    inFeed: InFeedPromotion;
    popup: PopupPromotion;
    targetCampuses: string[];
    tier?: Tier;
}

/** Any stored shape: current, partial, or the earlier single-tier one. */
export interface StoredPromotion {
    inFeed?: Partial<InFeedPromotion>;
    popup?: Partial<PopupPromotion>;
    targetCampuses?: string[];
    tier?: string;
    reach?: number;
    surfaces?: string[];
    cooldownHours?: number;
}

/** The parts of a listing promotions read. */
export interface PromotableListing {
    id: string;
    isVisible?: boolean;
    expiryDate?: string;
    promotion?: StoredPromotion | null;
}

export const DEFAULT_POPUP_COOLDOWN_HOURS = 24;

export const DEFAULT_PROMOTION: Promotion = {
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

export function deriveTier(
    promotion: { popup?: { enabled?: boolean }; inFeed?: { enabled?: boolean } } | null | undefined
): Tier {
    if (promotion?.popup?.enabled) return "L3";
    if (promotion?.inFeed?.enabled) return "L2";
    return "L1";
}

/** Fills defaults, and reads listings saved with the earlier single-tier shape. */
export function normalizePromotion(promotion?: StoredPromotion | null): Promotion {
    const p: StoredPromotion = promotion || {};
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

export function isListingLive(
    listing: Pick<PromotableListing, "isVisible" | "expiryDate">,
    todayStr = new Date().toISOString().slice(0, 10)
): boolean {
    if (listing.isVisible === false) return false;
    if (!listing.expiryDate) return true;
    return listing.expiryDate >= todayStr;
}

// FNV-1a: tiny, stable across browsers, and spreads ids evenly over 0-99.
export function hashToBucket(str: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 100;
}

export function isInReach(
    listingId: string,
    visitorId: string | null | undefined,
    reach: number
): boolean {
    if (reach >= 100) return true;
    if (!visitorId || reach <= 0) return false;
    return hashToBucket(`${visitorId}:${listingId}`) < reach;
}

/** Empty targetCampuses means every campus. A visitor with no campus only sees untargeted promos. */
export function matchesCampus(
    targetCampuses: string[] | null | undefined,
    campus: string | null | undefined
): boolean {
    if (!targetCampuses?.length) return true;
    return Boolean(campus) && targetCampuses.includes(campus as string);
}

/**
 * Promoted listings this visitor should see in one placement.
 */
export function selectPromotions<L extends PromotableListing>(
    listings: L[],
    {
        placement,
        surface,
        campus,
        visitorId,
        todayStr,
    }: {
        placement: Placement;
        surface?: string;
        campus?: string | null;
        visitorId?: string | null;
        todayStr?: string;
    }
): L[] {
    return listings.filter((listing) => {
        const promo = normalizePromotion(listing.promotion);
        const config: { enabled: boolean; reach: number; surfaces?: string[] } = promo[placement];
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
 * @returns item id -> promo listing
 */
export function planInsertions<P>(
    itemIds: string[],
    promos: P[],
    { first = 3, every = 8 }: { first?: number; every?: number } = {}
): Map<string, P> {
    const plan = new Map<string, P>();
    let next = 0;
    for (let i = first - 1; i < itemIds.length && next < promos.length; i += every) {
        plan.set(itemIds[i], promos[next++]);
    }
    return plan;
}

export function isInCooldown(
    dismissedAt: number | null | undefined,
    cooldownHours: number,
    now = Date.now()
): boolean {
    if (!dismissedAt) return false;
    return now - dismissedAt < cooldownHours * 60 * 60 * 1000;
}
