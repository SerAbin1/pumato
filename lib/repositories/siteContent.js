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

export async function saveOrderSettings(data) {
    const validated = OrderSettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.ORDER_SETTINGS), validated, {
        merge: true,
    });
}

export async function savePromoBanners(data) {
    const validated = PromoBannersSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.PROMO_BANNERS), validated);
}

export async function saveGrocerySettings(data) {
    const validated = GrocerySettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.GROCERY_SETTINGS), validated);
}

export async function saveMarketplaceCategories(data) {
    const validated = MarketplaceCategoriesSchema.parse(data);
    await setDoc(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_CATEGORIES),
        validated
    );
}

export async function saveMarketplaceFilters(data) {
    const validated = MarketplaceFiltersSchema.parse(data);
    await setDoc(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_FILTERS),
        validated
    );
}

export async function saveMarketplaceRedirectLinks(data) {
    const validated = MarketplaceRedirectLinksSchema.parse(data);
    await setDoc(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_REDIRECT_LINKS),
        validated
    );
}

// --- Reads ---

/** @returns {Promise<Object|null>} raw site_content doc data, or null if absent */
async function fetchSiteContent(docId) {
    const snap = await getDoc(doc(db, COLLECTIONS.SITE_CONTENT, docId));
    return snap.exists() ? snap.data() : null;
}

export const fetchOrderSettings = () => fetchSiteContent(SITE_CONTENT_DOCS.ORDER_SETTINGS);
export const fetchPromoBanners = () => fetchSiteContent(SITE_CONTENT_DOCS.PROMO_BANNERS);
export const fetchGrocerySettings = () => fetchSiteContent(SITE_CONTENT_DOCS.GROCERY_SETTINGS);
