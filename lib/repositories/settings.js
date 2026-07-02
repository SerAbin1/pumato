import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { LaundryGeneralSettingsSchema, LaundrySlotsSchema } from "@/lib/schemas/settings";
import { COLLECTIONS } from "@/lib/constants";

export async function saveLaundrySettings(data) {
    const validated = LaundryGeneralSettingsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.GENERAL_SETTINGS, "laundry"), validated);
}

export async function saveLaundrySlots(docId, data) {
    const validated = LaundrySlotsSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.LAUNDRY_SLOTS, docId), validated);
}
