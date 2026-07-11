import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import {
    LaundryCampusSettingsSchema,
    LaundryPricingSchema,
    LaundrySlotsSchema,
} from "@/lib/schemas/settings";
import { COLLECTIONS, LAUNDRY_SETTINGS_DOCS } from "@/lib/constants";

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
