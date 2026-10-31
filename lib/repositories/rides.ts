import type { z } from "zod";
import { db } from "@/lib/firebase";
import {
    addDoc,
    collection,
    deleteDoc,
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
import { averageRating, DEFAULT_RIDE_SCHEDULE, FARE_OFFER_STEPS, maskPhone } from "@/lib/rides";
import type {
    RideFares,
    RidePreference,
    RideRequest,
    Rider,
    RiderGender,
    RidesAvailability,
    RidesSettings,
    RidesStats,
    RideWaitlistEntry,
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
    "name" | "phone" | "vehicleNumber" | "collegeId" | "campusId" | "gender"
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

/** Admin: moves a rider to the campus they now give rides on. */
export async function setRiderCampus(uid: string, campusId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDERS, uid), { campusId, updatedAt: serverTimestamp() });
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
    | "campusId"
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
    // Snapshot what the user may see about the rider: a masked number and their
    // rating, not the rider's whole application.
    const riderData = (await getDoc(doc(db, COLLECTIONS.RIDERS, rider.uid))).data() ?? {};
    const masked = maskPhone(String(riderData.phone ?? ""));
    const rating = averageRating(riderData);
    const ref = doc(db, COLLECTIONS.RIDE_REQUESTS, requestId);
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.data()?.status !== "pending") throw new Error(RIDE_TAKEN);
        tx.update(ref, {
            status: "accepted",
            riderUid: rider.uid,
            riderName: rider.name,
            ...(masked && { riderPhoneMasked: masked }),
            ...(rating !== null && { riderRating: rating }),
            ...(riderData.ratingCount > 0 && { riderRatingCount: riderData.ratingCount }),
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
        riderPhoneMasked: deleteField(),
        riderRating: deleteField(),
        riderRatingCount: deleteField(),
        acceptedAt: deleteField(),
        userConfirmedAt: deleteField(),
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

/** Raises the fare while the ride waits, to attract riders. @returns the new fare */
export async function offerHigherFare(requestId: string, increment: number): Promise<number> {
    if (!(FARE_OFFER_STEPS as readonly number[]).includes(increment)) {
        throw new Error("Pick a ₹5, ₹10 or ₹15 increase");
    }
    const ref = doc(db, COLLECTIONS.RIDE_REQUESTS, requestId);
    return runTransaction(db, async (tx) => {
        const data = (await tx.get(ref)).data();
        if (data?.status !== "pending") throw new Error("This ride is no longer waiting");
        const fare = (data.fare ?? 0) + increment;
        tx.update(ref, { fare });
        return fare;
    });
}

/** The user accepts the rider within their minute; otherwise the sweep confirms for them. */
export async function confirmRideByUser(requestId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.RIDE_REQUESTS, requestId), {
        userConfirmedAt: serverTimestamp(),
    });
}

/** Signs the user up for their campus's waitlist, replacing any other campus. */
export async function joinRideWaitlist(uid: string, campusId: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.RIDE_WAITLIST, uid);
    await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists()) {
            tx.update(ref, { campusId, updatedAt: serverTimestamp() });
        } else {
            tx.set(ref, {
                userId: uid,
                campusId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
    });
}

export async function leaveRideWaitlist(uid: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.RIDE_WAITLIST, uid));
}

/** The user's waitlist sign-up, whatever campus they picked. */
export function subscribeWaitlistEntry(
    uid: string,
    onChange: (entry: RideWaitlistEntry | null) => void,
    onError: (error: Error) => void
): Unsubscribe {
    return onSnapshot(
        doc(db, COLLECTIONS.RIDE_WAITLIST, uid),
        (snap) => onChange(snap.exists() ? (snap.data() as RideWaitlistEntry) : null),
        onError
    );
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
 * Today's pending ride-now requests on the rider's campus, oldest first.
 * `campusId` and `preferences` must match what the rider may read (see
 * firestore.rules), or the query is refused.
 */
export function subscribePendingRides(
    campusId: string,
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
            where("campusId", "==", campusId),
            where("riderPreference", "in", preferences),
            where("createdAt", ">=", Timestamp.fromDate(todayStart)),
            orderBy("createdAt", "asc")
        ),
        onChange,
        onError,
        (r) => !r.scheduledFor
    );
}

/** Pending scheduled requests on the rider's campus, soonest first, including ones just past their time. */
export function subscribeUpcomingRides(
    campusId: string,
    preferences: RidePreference[],
    onChange: RidesListener,
    onError: (error: Error) => void,
    now = new Date()
): Unsubscribe {
    return listen(
        query(
            rideRequests(),
            where("status", "==", "pending"),
            where("campusId", "==", campusId),
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

/** Admin: the newest requests, live, up to `max`. */
export function subscribeAdminRideRequests(
    max: number,
    onChange: RidesListener,
    onError: (error: Error) => void
): Unsubscribe {
    return listen(
        query(rideRequests(), orderBy("createdAt", "desc"), limit(max)),
        onChange,
        onError
    );
}

/** The rider's completed rides: the latest 100 on a first visit, then only those
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

/** Whether any female rider on the campus can take a request; nobody until the function first writes it. */
export function subscribeRideAvailability(
    campusId: string,
    onChange: (availability: RidesAvailability) => void
): Unsubscribe {
    return onSnapshot(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.RIDES_AVAILABILITY),
        (snap) =>
            onChange({ femaleOnline: false, femaleApproved: false, ...snap.data()?.[campusId] }),
        (error) => console.error("Failed to load rider availability:", error)
    );
}

export const EMPTY_RIDES_STATS: RidesStats = {
    totalRiders: 0,
    onlineRiders: 0,
    completedRides: 0,
    waitlist: {},
};

/** Public counters for the booking page and admin, kept by the ride functions. */
export function subscribeRideStats(
    onChange: (stats: RidesStats) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    return onSnapshot(
        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.RIDES_STATS),
        (snap) =>
            onChange({
                ...EMPTY_RIDES_STATS,
                ...snap.data(),
                waitlist: snap.data()?.waitlist ?? {},
            }),
        onError
    );
}
