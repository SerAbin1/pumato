import {
    onDocumentCreated,
    onDocumentUpdated,
    onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getFcmTokensByUids } from "./fcm-tokens";
import { DAY_MS, IST_TIME_ZONE } from "./ist";
import {
    affectsAvailability,
    availabilityByCampus,
    DEFAULT_SCHEDULE,
    formatRideTime,
    inAudience,
    newRating,
    planScheduledRide,
    pushAudience,
    rideRequestBody,
} from "./ride-flow";
import type { PushAudience, SweepAction, SweepSchedule } from "./ride-flow";

const db = getFirestore();
const messaging = getMessaging();

const RIDER_URL = "/rides/rider";

/** Data-only, so the service worker builds the notification with this tag and opens targetUrl. */
interface Push {
    title: string;
    body: string;
    tag: string;
    // Seconds; a ride-now request nobody sees within a few minutes is stale.
    ttl: number;
}

async function pushUids(uids: string[], { ttl, ...push }: Push) {
    const tokens = await getFcmTokensByUids(uids);
    await Promise.allSettled(
        tokens.map((token) =>
            messaging.send({
                token,
                data: { ...push, targetUrl: RIDER_URL },
                webpush: { headers: { Urgency: "high", TTL: String(ttl) } },
            })
        )
    );
}

async function pushRiders({ campusId, onlineOnly, gender }: PushAudience, push: Push) {
    let riders = db
        .collection("riders")
        .where("status", "==", "approved")
        .where("campusId", "==", campusId);
    if (onlineOnly) riders = riders.where("online", "==", true);
    const snap = await riders.get();
    await pushUids(
        snap.docs.filter((doc) => inAudience(doc.data(), gender)).map((doc) => doc.id),
        push
    );
}

const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : undefined);

/** The fields the notification helpers read, with timestamps as Dates. */
const rideOf = (data: DocumentData) => ({
    pickupName: data.pickupName as string,
    dropName: data.dropName as string,
    fare: data.fare as number | null,
    riderPreference: data.riderPreference ?? "any",
    campusId: data.campusId as string,
    passengers: data.passengers as number | undefined,
    scheduledFor: toDate(data.scheduledFor),
    scheduled: data.scheduledFor !== undefined,
});

const requestPush = (data: DocumentData, title: string): Push => {
    const ride = rideOf(data);
    return {
        title,
        body: rideRequestBody(ride),
        tag: "ride-request",
        // A scheduled ride is still worth hearing about hours later.
        ttl: ride.scheduled ? 6 * 60 * 60 : 300,
    };
};

/**
 * Pushes riders when a request is booked; the first to accept on their
 * dashboard gets it. Ride-now requests go to online riders on the request's
 * campus, scheduled ones to every approved rider there; a female-rider
 * preference narrows either to female riders.
 */
export const notifyRidersOfRequest = onDocumentCreated(
    "ride_requests/{requestId}",
    async (event) => {
        const data = event.data?.data();
        if (!data) return;
        const ride = rideOf(data);
        await pushRiders(
            pushAudience("new", ride),
            requestPush(data, ride.scheduled ? "New scheduled ride" : "New ride request")
        );
    }
);

/**
 * Follows the user's changes to their request: dropping the female-rider
 * preference reaches the other riders, and cancelling tells the accepted rider.
 */
export const onRideRequestUpdated = onDocumentUpdated(
    "ride_requests/{requestId}",
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        if (!before || !after) return;

        if (
            after.status === "pending" &&
            before.riderPreference === "female" &&
            after.riderPreference === "any"
        ) {
            await pushRiders(
                pushAudience("widened", rideOf(after)),
                requestPush(after, "New ride request")
            );
        }

        const rated = newRating(before, after);
        if (rated && event.data) await countRating(event.data.after.ref, rated);

        if (after.status === "cancelled" && before.status === "accepted" && before.riderUid) {
            await pushUids([before.riderUid], {
                title: "Ride cancelled",
                body: `${rideRequestBody(rideOf(before))} was cancelled by the guest.`,
                tag: "ride-cancelled",
                ttl: 60 * 60,
            });
        }
    }
);

/**
 * Adds a ride's rating to its rider's total. Stamps the ride in the same
 * transaction, so a retried trigger can't count it twice.
 */
async function countRating(
    ride: DocumentReference,
    { riderUid, rating }: { riderUid: string; rating: number }
) {
    try {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(ride);
            if (snap.get("ratingCountedAt")) return;
            tx.update(db.collection("riders").doc(riderUid), {
                ratingSum: FieldValue.increment(rating),
                ratingCount: FieldValue.increment(1),
            });
            tx.update(ride, { ratingCountedAt: FieldValue.serverTimestamp() });
        });
    } catch (error) {
        console.error(`Failed to count the rating on ${ride.id}:`, error);
    }
}

/** Applies the sweep's decision to one ride, re-read in a transaction so a rider's confirm isn't lost. */
async function sweepRide(
    ref: DocumentReference,
    now: Date,
    schedule: SweepSchedule
): Promise<{ action: SweepAction; data: DocumentData } | null> {
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data();
        if (!data || (data.status !== "pending" && data.status !== "accepted")) return null;
        const scheduledFor = toDate(data.scheduledFor);
        if (!scheduledFor) return null;

        const action = planScheduledRide(
            {
                status: data.status,
                scheduledFor,
                acceptedAt: toDate(data.acceptedAt),
                broadcastAt: toDate(data.broadcastAt),
                confirmRequestedAt: toDate(data.confirmRequestedAt),
                riderConfirmedAt: toDate(data.riderConfirmedAt),
            },
            now,
            schedule
        );
        const at = Timestamp.fromDate(now);
        switch (action) {
            case "broadcast":
                tx.update(ref, { broadcastAt: at });
                break;
            case "remind":
                tx.update(ref, { confirmRequestedAt: at });
                break;
            case "autoConfirm":
                tx.update(ref, {
                    confirmRequestedAt: data.acceptedAt,
                    riderConfirmedAt: data.acceptedAt,
                });
                break;
            case "release":
                tx.update(ref, {
                    status: "pending",
                    riderUid: FieldValue.delete(),
                    riderName: FieldValue.delete(),
                    acceptedAt: FieldValue.delete(),
                    confirmRequestedAt: FieldValue.delete(),
                    broadcastAt: at,
                });
                break;
            case "expire":
                tx.update(ref, { status: "expired" });
                break;
        }
        return action && { action, data };
    });
}

async function notifySweep(action: SweepAction, data: DocumentData, schedule: SweepSchedule) {
    const ride = rideOf(data);
    const when = ride.scheduledFor ? formatRideTime(ride.scheduledFor) : "";
    const rebroadcast = () =>
        pushRiders(pushAudience("rebroadcast", ride), {
            ...requestPush(data, "Scheduled ride needs a rider"),
            ttl: schedule.reminderMinutes * 60,
        });

    switch (action) {
        case "broadcast":
            await rebroadcast();
            break;
        case "remind":
            await pushUids([data.riderUid], {
                title: "Confirm your scheduled ride",
                body: `${ride.pickupName} → ${ride.dropName} at ${when}. Confirm within ${schedule.confirmMinutes} min or it goes to other riders.`,
                tag: "ride-confirm",
                ttl: schedule.confirmMinutes * 60,
            });
            break;
        case "release":
            await Promise.all([
                pushUids([data.riderUid], {
                    title: "Ride released",
                    body: `You didn't confirm ${ride.pickupName} → ${ride.dropName} at ${when}, so it went to other riders.`,
                    tag: "ride-released",
                    ttl: 60 * 60,
                }),
                rebroadcast(),
            ]);
            break;
    }
}

/**
 * Runs scheduled rides through their last stretch (see planScheduledRide):
 * reminds and releases the accepted rider, re-pushes unclaimed rides, and
 * expires the ones nobody took.
 */
export const sweepScheduledRides = onSchedule(
    { schedule: "every 1 minutes", timeZone: IST_TIME_ZONE },
    async () => {
        const now = new Date();
        const settings = await db.collection("site_content").doc("rides_settings").get();
        const schedule: SweepSchedule = { ...DEFAULT_SCHEDULE, ...settings.data()?.schedule };

        const due = await db
            .collection("ride_requests")
            .where("status", "in", ["pending", "accepted"])
            .where(
                "scheduledFor",
                "<=",
                Timestamp.fromMillis(now.getTime() + schedule.reminderMinutes * 60_000)
            )
            .where("scheduledFor", ">=", Timestamp.fromMillis(now.getTime() - DAY_MS))
            .get();

        await Promise.allSettled(
            due.docs.map(async (doc) => {
                const result = await sweepRide(doc.ref, now, schedule);
                if (result) await notifySweep(result.action, result.data, schedule);
            })
        );
    }
);

/**
 * Keeps `site_content/rides_availability` in step with the riders, so the
 * booking page (which can't read riders) knows whether a female rider on the
 * campus can take a request: online now for a ride-now, approved at all for a
 * scheduled one. Keyed by campus.
 */
export const ridersAvailability = onDocumentWritten("riders/{uid}", async (event) => {
    if (!affectsAvailability(event.data?.before.data(), event.data?.after.data())) return;

    const female = db
        .collection("riders")
        .where("status", "==", "approved")
        .where("gender", "==", "female");
    await db.runTransaction(async (tx) => {
        const riders = await tx.get(female);
        tx.set(
            db.collection("site_content").doc("rides_availability"),
            availabilityByCampus(
                riders.docs.map((doc) => ({
                    campusId: doc.get("campusId"),
                    online: doc.get("online"),
                }))
            )
        );
    });
});
