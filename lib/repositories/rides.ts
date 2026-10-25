import type { z } from "zod";
import { db } from "@/lib/firebase";
import {
    addDoc,
    collection,
    deleteField,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import type { Query, Unsubscribe } from "firebase/firestore";
import {
    RideFaresSchema,
    RideRatingSchema,
    RideRequestSchema,
    RiderSchema,
    RidesSettingsSchema,
} from "@/lib/schemas/rides";
import { COLLECTIONS, SITE_CONTENT_DOCS } from "@/lib/constants";
import { DEFAULT_RIDE_SCHEDULE } from "@/lib/rides";
import type {
    RideFares,
    RidePreference,
    RideRequest,
    Rider,
    RiderGender,
    RidesAvailability,
    RidesSettings,
} from "@/lib/types";

const settingsRef = () => doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.RIDES_SETTINGS);

export const EMPTY_RIDES_SETTINGS: RidesSettings = {
    whatsappNumber: "",
    telegramUsername: "",
    places: [],
    fares: {},
    schedule: DEFAULT_RIDE_SCHEDULE,
};

/** @returns rides settings, or empty defaults if the admin hasn't saved any yet */
export async function fetchRidesSettings(): Promise<RidesSettings> {
    const snap = await getDoc(settingsRef());
    return snap.exists() ? { ...EMPTY_RIDES_SETTINGS, ...snap.data() } : EMPTY_RIDES_SETTINGS;
}

/** Drops fares for deleted places, so the map doesn't collect dead routes. */
export async function saveRidesSettings(data: z.input<typeof RidesSettingsSchema>): Promise<void> {
    const ids = new Set(data.places.map((p) => p.id));
    const fares = Object.fromEntries(
        Object.entries(data.fares).filter(([key]) => key.split(":").every((id) => ids.has(id)))
    );
    await setDoc(settingsRef(), RidesSettingsSchema.parse({ ...data, fares }));
}

/** Replaces the whole fares map, so cleared routes drop out. */
export async function saveRideFares(fares: RideFares): Promise<void> {
    await updateDoc(settingsRef(), { fares: RideFaresSchema.parse(fares) });
}

/** @returns the signed-in user's rider application, or null if they haven't applied */
export async function fetchRider(uid: string): Promise<Rider | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.RIDERS, uid));
    return snap.exists() ? (snap.data() as Rider) : null;
}

/** The signed-in user's rider doc as it changes: going online elsewhere, a new rating. */
export function subscribeRider(
    uid: string,
    onChange: (rider: Rider | null) => void,
    onError: (error: Error) => void
): Unsubscribe {
    return onSnapshot(
        doc(db, COLLECTIONS.RIDERS, uid),
        (snap) => onChange(snap.exists() ? (snap.data() as Rider) : null),
        onError
    );
}

export type RiderApplication = Pick<
    Rider,
    "name" | "phone" | "vehicleNumber" | "collegeId" | "gender"
>;

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

/** Admin: records gender for riders approved before the application asked it. */
export async function setRiderGender(uid: string, gender: RiderGender): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDERS, uid), { gender, updatedAt: serverTimestamp() });
}

export async function setRiderOnline(uid: string, online: boolean): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDERS, uid), { online, updatedAt: serverTimestamp() });
}

export type RideBooking = Pick<
    z.input<typeof RideRequestSchema>,
    | "name"
    | "phone"
    | "pickupId"
    | "pickupName"
    | "dropId"
    | "dropName"
    | "fare"
    | "passengers"
    | "pickupLocation"
    | "userId"
> & {
    riderPreference: RidePreference;
    /** Set for a scheduled ride, which also needs `userId`. */
    scheduledFor?: Date;
};

export async function createRideRequest({ scheduledFor, ...data }: RideBooking): Promise<string> {
    const validated = RideRequestSchema.parse({
        ...data,
        ...(scheduledFor && { scheduledFor: Timestamp.fromDate(scheduledFor) }),
        status: "pending",
        createdAt: serverTimestamp(),
    });
    const ref = await addDoc(collection(db, COLLECTIONS.RIDE_REQUESTS), validated);
    return ref.id;
}

/** Thrown by acceptRide when another rider got there first. */
export const RIDE_TAKEN = "ride-taken";

/** First rider to accept gets the ride; the transaction retries if two race. */
export async function acceptRide(
    requestId: string,
    rider: { uid: string; name: string }
): Promise<void> {
    const ref = doc(db, COLLECTIONS.RIDE_REQUESTS, requestId);
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.data()?.status !== "pending") throw new Error(RIDE_TAKEN);
        tx.update(ref, {
            status: "accepted",
            riderUid: rider.uid,
            riderName: rider.name,
            acceptedAt: serverTimestamp(),
        });
    });
}

export async function completeRide(requestId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDE_REQUESTS, requestId), {
        status: "completed",
        completedAt: serverTimestamp(),
    });
}

/** Hands an accepted ride back so another online rider can take it. */
export async function releaseRide(requestId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDE_REQUESTS, requestId), {
        status: "pending",
        riderUid: deleteField(),
        riderName: deleteField(),
        acceptedAt: deleteField(),
        confirmRequestedAt: deleteField(),
        riderConfirmedAt: deleteField(),
    });
}

/** The accepted rider confirms they'll still give a scheduled ride. */
export async function confirmRide(requestId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDE_REQUESTS, requestId), {
        riderConfirmedAt: serverTimestamp(),
    });
}

/** Drops the female-rider preference so every rider can take the request. */
export async function widenRideRequest(requestId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDE_REQUESTS, requestId), { riderPreference: "any" });
}

/** The user cancels their scheduled ride. */
export async function cancelRideRequest(requestId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDE_REQUESTS, requestId), {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
    });
}

/** The user rates the rider of their completed ride, once. */
export async function rateRide(requestId: string, rating: number): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDE_REQUESTS, requestId), {
        rating: RideRatingSchema.parse(rating),
    });
}

type RidesListener = (rides: RideRequest[]) => void;

function listen(
    q: Query,
    onChange: RidesListener,
    onError: (error: Error) => void,
    keep: (r: RideRequest) => boolean = () => true
): Unsubscribe {
    return onSnapshot(
        q,
        (snap) =>
            onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RideRequest).filter(keep)),
        onError
    );
}

const rideRequests = () => collection(db, COLLECTIONS.RIDE_REQUESTS);

// How long a scheduled ride stays on the riders' list after its time.
const UPCOMING_GRACE_MS = 60 * 60 * 1000;

/**
 * Today's pending ride-now requests, oldest first. `preferences` must match
 * what the rider may read (see firestore.rules), or the query is refused.
 */
export function subscribePendingRides(
    preferences: RidePreference[],
    onChange: RidesListener,
    onError: (error: Error) => void,
    now = new Date()
): Unsubscribe {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    return listen(
        query(
            rideRequests(),
            where("status", "==", "pending"),
            where("riderPreference", "in", preferences),
            where("createdAt", ">=", Timestamp.fromDate(todayStart)),
            orderBy("createdAt", "asc")
        ),
        onChange,
        onError,
        (r) => !r.scheduledFor
    );
}

/** Pending scheduled requests, soonest first, including ones just past their time. */
export function subscribeUpcomingRides(
    preferences: RidePreference[],
    onChange: RidesListener,
    onError: (error: Error) => void,
    now = new Date()
): Unsubscribe {
    return listen(
        query(
            rideRequests(),
            where("status", "==", "pending"),
            where("riderPreference", "in", preferences),
            where(
                "scheduledFor",
                ">=",
                Timestamp.fromDate(new Date(now.getTime() - UPCOMING_GRACE_MS))
            ),
            orderBy("scheduledFor", "asc")
        ),
        onChange,
        onError
    );
}

/** Rides this rider accepted and hasn't finished. */
export function subscribeRiderRides(
    riderUid: string,
    onChange: RidesListener,
    onError: (error: Error) => void
): Unsubscribe {
    return listen(
        query(rideRequests(), where("riderUid", "==", riderUid), where("status", "==", "accepted")),
        onChange,
        onError
    );
}

/** Every ride the signed-in user booked, ride now or scheduled, latest booked first. */
export function subscribeMyRides(
    userId: string,
    onChange: RidesListener,
    onError: (error: Error) => void
): Unsubscribe {
    return listen(
        query(
            rideRequests(),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limit(30)
        ),
        onChange,
        onError
    );
}

/**
 * The rider's completed rides: the latest 100 on a first visit, then only those
 * completed after `syncedTo` (epoch ms), latest first.
 */
export async function fetchRiderCompletedRides(
    riderUid: string,
    syncedTo: number | null
): Promise<RideRequest[]> {
    const snap = await getDocs(
        query(
            rideRequests(),
            where("riderUid", "==", riderUid),
            where("status", "==", "completed"),
            ...(syncedTo === null
                ? [orderBy("completedAt", "desc"), limit(100)]
                : [
                      where("completedAt", ">", Timestamp.fromMillis(syncedTo)),
                      orderBy("completedAt", "desc"),
                  ])
        )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RideRequest);
}

/** Whether any female rider can take a request; nobody until the function first writes it. */
export function subscribeRideAvailability(
    onChange: (availability: RidesAvailability) => void
): Unsubscribe {
    return onSnapshot(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.RIDES_AVAILABILITY),
        (snap) => onChange({ femaleOnline: false, femaleApproved: false, ...snap.data() }),
        (error) => console.error("Failed to load rider availability:", error)
    );
}
