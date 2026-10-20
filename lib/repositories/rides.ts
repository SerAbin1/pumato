import type { z } from "zod";
import { db } from "@/lib/firebase";
import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { RideRequestSchema, RiderSchema, RidesSettingsSchema } from "@/lib/schemas/rides";
import { COLLECTIONS, SITE_CONTENT_DOCS } from "@/lib/constants";
import type { Rider, RidesSettings } from "@/lib/types";

const settingsRef = () => doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.RIDES_SETTINGS);

export const EMPTY_RIDES_SETTINGS: RidesSettings = {
    whatsappNumber: "",
    telegramUsername: "",
    places: [],
};

/** @returns rides settings, or empty defaults if the admin hasn't saved any yet */
export async function fetchRidesSettings(): Promise<RidesSettings> {
    const snap = await getDoc(settingsRef());
    return snap.exists() ? { ...EMPTY_RIDES_SETTINGS, ...snap.data() } : EMPTY_RIDES_SETTINGS;
}

export async function saveRidesSettings(data: z.input<typeof RidesSettingsSchema>): Promise<void> {
    await setDoc(settingsRef(), RidesSettingsSchema.parse(data));
}

/** @returns the signed-in user's rider application, or null if they haven't applied */
export async function fetchRider(uid: string): Promise<Rider | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.RIDERS, uid));
    return snap.exists() ? (snap.data() as Rider) : null;
}

export type RiderApplication = Pick<Rider, "name" | "phone" | "vehicleNumber" | "collegeId">;

/**
 * Files or re-files (edit while pending, re-apply after rejection) the
 * application. Always lands as `pending`; approval happens in manageUsers.
 */
export async function submitRiderApplication(
    user: { uid: string; email: string | null },
    application: RiderApplication,
    isNew: boolean
): Promise<void> {
    const now = serverTimestamp();
    const validated = RiderSchema.parse({
        ...application,
        uid: user.uid,
        email: user.email,
        status: "pending",
        createdAt: now,
        updatedAt: now,
    });
    const ref = doc(db, COLLECTIONS.RIDERS, user.uid);
    if (isNew) {
        await setDoc(ref, validated);
    } else {
        // Keep the original createdAt so the admin list stays in application order.
        const { createdAt: _createdAt, ...rest } = validated;
        await setDoc(ref, rest, { merge: true });
    }
}

export async function createRideRequest(
    data: Omit<z.input<typeof RideRequestSchema>, "status" | "fare" | "createdAt">
): Promise<string> {
    const validated = RideRequestSchema.parse({
        ...data,
        fare: null,
        status: "pending",
        createdAt: serverTimestamp(),
    });
    const ref = await addDoc(collection(db, COLLECTIONS.RIDE_REQUESTS), validated);
    return ref.id;
}
