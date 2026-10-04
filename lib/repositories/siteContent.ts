import type { z } from "zod";
import type { AnyRecord, GrocerySettings, OrderSettings, PromoBanners } from "@/lib/types";
import type { TrendingDoc } from "@/lib/trending";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    OrderSettingsSchema,
    PromoBannersSchema,
    GrocerySettingsSchema,
    MarketplaceCategoriesSchema,
    MarketplaceFiltersSchema,
    MarketplaceRedirectLinksSchema,
} from "@/lib/schemas/siteContent";
import { COLLECTIONS, SITE_CONTENT_DOCS } from "@/lib/constants";

export async function saveOrderSettings(data: z.input<typeof OrderSettingsSchema>): Promise<void> {
    const validated = OrderSettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.ORDER_SETTINGS), validated, {
        merge: true,
    });
}

export async function savePromoBanners(data: z.input<typeof PromoBannersSchema>): Promise<void> {
    const validated = PromoBannersSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.PROMO_BANNERS), validated);
}

export async function saveGrocerySettings(
    data: z.input<typeof GrocerySettingsSchema>
): Promise<void> {
    const validated = GrocerySettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.GROCERY_SETTINGS), validated);
}

export async function saveMarketplaceCategories(
    data: z.input<typeof MarketplaceCategoriesSchema>
): Promise<void> {
    const validated = MarketplaceCategoriesSchema.parse(data);
    await setDoc(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_CATEGORIES),
        validated
    );
}

export async function saveMarketplaceFilters(
    data: z.input<typeof MarketplaceFiltersSchema>
): Promise<void> {
    const validated = MarketplaceFiltersSchema.parse(data);
    await setDoc(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_FILTERS),
        validated
    );
}

export async function saveMarketplaceRedirectLinks(
    data: z.input<typeof MarketplaceRedirectLinksSchema>
): Promise<void> {
    const validated = MarketplaceRedirectLinksSchema.parse(data);
    await setDoc(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_REDIRECT_LINKS),
        validated
    );
}

// --- Reads ---

/** @returns raw site_content doc data, or null if absent */
async function fetchSiteContent<T = AnyRecord>(docId: string): Promise<T | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.SITE_CONTENT, docId));
    return snap.exists() ? (snap.data() as T) : null;
}

export const fetchOrderSettings = () =>
    fetchSiteContent<OrderSettings>(SITE_CONTENT_DOCS.ORDER_SETTINGS);
export const fetchPromoBanners = () =>
    fetchSiteContent<PromoBanners>(SITE_CONTENT_DOCS.PROMO_BANNERS);
export const fetchGrocerySettings = () =>
    fetchSiteContent<GrocerySettings>(SITE_CONTENT_DOCS.GROCERY_SETTINGS);
export const fetchTrending = () => fetchSiteContent<TrendingDoc>(SITE_CONTENT_DOCS.TRENDING);
