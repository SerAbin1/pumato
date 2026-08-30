import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    LaundryCampusSettingsSchema,
    LaundryPricingSchema,
    LaundrySlotsSchema,
} from "@/lib/schemas/settings";
import { COLLECTIONS, LAUNDRY_SETTINGS_DOCS, DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

export async function saveLaundryCampus(data) {
    const validated = LaundryCampusSettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.LAUNDRY_SETTINGS, LAUNDRY_SETTINGS_DOCS.CAMPUS), validated);
}

export async function saveLaundryPricing(data) {
    const validated = LaundryPricingSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.LAUNDRY_SETTINGS, LAUNDRY_SETTINGS_DOCS.PRICING), validated);
}

export async function saveLaundrySlots(docId, data) {
    const validated = LaundrySlotsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.LAUNDRY_SLOTS, docId), validated);
}

// --- Reads ---

const DEFAULT_LAUNDRY_PRICING = { pricePerKg: "79", steamIronPrice: "15" };

/**
 * Campus config + pricing, which the laundry tab edits and saves as one unit.
 * Falls back to defaults so the editor always has a shape to render.
 */
export async function fetchLaundryConfig() {
    const [campusSnap, pricingSnap] = await Promise.all([
        getDoc(doc(db, COLLECTIONS.LAUNDRY_SETTINGS, LAUNDRY_SETTINGS_DOCS.CAMPUS)),
        getDoc(doc(db, COLLECTIONS.LAUNDRY_SETTINGS, LAUNDRY_SETTINGS_DOCS.PRICING)),
    ]);

    return {
        campuses: campusSnap.data()?.campuses || DEFAULT_CAMPUS_CONFIG,
        pricing: pricingSnap.exists() ? pricingSnap.data() : DEFAULT_LAUNDRY_PRICING,
    };
}

/** @returns {Promise<string[]>} slot labels for a date or "default" */
export async function fetchLaundrySlots(docId) {
    const snap = await getDoc(doc(db, COLLECTIONS.LAUNDRY_SLOTS, docId));
    return snap.exists() ? snap.data().slots || [] : [];
}
