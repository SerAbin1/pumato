import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
    OrderSettingsSchema,
    PromoBannersSchema,
    GrocerySettingsSchema,
} from "@/lib/schemas/siteContent";
import { COLLECTIONS, SITE_CONTENT_DOCS } from "@/lib/constants";

export async function saveOrderSettings(data) {
    const validated = OrderSettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.ORDER_SETTINGS), validated);
}

export async function savePromoBanners(data) {
    const validated = PromoBannersSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.PROMO_BANNERS), validated);
}

export async function saveGrocerySettings(data) {
    const validated = GrocerySettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.GROCERY_SETTINGS), validated);
}
