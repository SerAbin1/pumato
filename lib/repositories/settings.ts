import type { z } from "zod";
import type { CampusConfig, LaundryPricing } from "@/lib/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    LaundryCampusSettingsSchema,
    LaundryPricingSchema,
    LaundrySlotsSchema,
} from "@/lib/schemas/settings";
import { COLLECTIONS, LAUNDRY_SETTINGS_DOCS, DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

export async function saveLaundryCampus(
    data: z.input<typeof LaundryCampusSettingsSchema>
): Promise<void> {
    const validated = LaundryCampusSettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.LAUNDRY_SETTINGS, LAUNDRY_SETTINGS_DOCS.CAMPUS), validated);
}

export async function saveLaundryPricing(
    data: z.input<typeof LaundryPricingSchema>
): Promise<void> {
    const validated = LaundryPricingSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.LAUNDRY_SETTINGS, LAUNDRY_SETTINGS_DOCS.PRICING), validated);
}

export async function saveLaundrySlots(
    docId: string,
    data: z.input<typeof LaundrySlotsSchema>
): Promise<void> {
    const validated = LaundrySlotsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.LAUNDRY_SLOTS, docId), validated);
}

// --- Reads ---

const DEFAULT_LAUNDRY_PRICING = { pricePerKg: "79", steamIronPrice: "15" };

/**
 * Campus config + pricing, which the laundry tab edits and saves as one unit.
 * Falls back to defaults so the editor always has a shape to render.
 */
export async function fetchLaundryConfig(): Promise<{
    campuses: CampusConfig[];
    pricing: LaundryPricing;
}> {
    const [campusSnap, pricingSnap] = await Promise.all([
        getDoc(doc(db, COLLECTIONS.LAUNDRY_SETTINGS, LAUNDRY_SETTINGS_DOCS.CAMPUS)),
        getDoc(doc(db, COLLECTIONS.LAUNDRY_SETTINGS, LAUNDRY_SETTINGS_DOCS.PRICING)),
    ]);

    return {
        campuses: campusSnap.data()?.campuses || DEFAULT_CAMPUS_CONFIG,
        pricing: pricingSnap.exists()
            ? (pricingSnap.data() as LaundryPricing)
            : DEFAULT_LAUNDRY_PRICING,
    };
}

/** @returns slot labels for a date or "default" */
export async function fetchLaundrySlots(docId: string): Promise<string[]> {
    const snap = await getDoc(doc(db, COLLECTIONS.LAUNDRY_SLOTS, docId));
    return snap.exists() ? snap.data().slots || [] : [];
}
