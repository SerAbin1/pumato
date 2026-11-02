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
    AUTO_CANCEL_MINUTES,
    availabilityByCampus,
    completionChanged,
    DEFAULT_SCHEDULE,
    fareIncrease,
    formatRideTime,
    inAudience,
    isStaleRideNow,
    newRating,
    planScheduledRide,
    planUserConfirmation,
    pushAudience,
    rideRequestBody,
    USER_CONFIRM_MINUTES,
    waitlistByCampus,
} from "./ride-flow";
import type { PushAudience, SweepAction, SweepSchedule } from "./ride-flow";

const db = getFirestore();
const messaging = getMessaging();

const PILOT_URL = "/rides/pilot";
const USER_URL = "/rides";

/** Data-only, so the service worker builds the notification with this tag and opens targetUrl. */
interface Push {
    title: string;
    body: string;
    tag: string;
    // Seconds; a ride-now request nobody sees within a few minutes is stale.
    ttl: number;
    targetUrl?: string;
}

async function pushUids(uids: string[], { ttl, targetUrl = PILOT_URL, ...push }: Push) {
    const tokens = await getFcmTokensByUids(uids);
    await Promise.allSettled(
        tokens.map((token) =>
            messaging.send({
                token,
                data: { ...push, targetUrl },
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

/** "Ravi · 4.8★ · 98******10 accepted Gate 1 → Library · ₹20. Confirm within 1 minute." */
const acceptedBody = (data: DocumentData): string => {
    const rider = [
        data.riderName as string,
        typeof data.riderRating === "number" ? `${data.riderRating}★` : null,
        data.riderPhoneMasked as string | undefined,
    ]
        .filter(Boolean)
        .join(" · ");
    return `${rider} accepted ${rideRequestBody(rideOf(data))}. Confirm within ${USER_CONFIRM_MINUTES} minute or it confirms automatically.`;
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

        // A higher offer is a fresh reason for riders to take it.
        const raised = fareIncrease(before, after);
        if (after.status === "pending" && raised !== null) {
            await pushRiders(
                pushAudience("new", rideOf(after)),
                requestPush(after, `Fare raised by ₹${raised}: now ₹${after.fare}`)
            );
        }

        // The rider accepted: the user checks who is coming and can cancel for a minute.
        if (before.status === "pending" && after.status === "accepted" && after.userId) {
            await pushUids([after.userId], {
                title: "Pilot found",
                body: acceptedBody(after),
                tag: "ride-accepted",
                ttl: (USER_CONFIRM_MINUTES + 2) * 60,
                targetUrl: USER_URL,
            });
        }

        if (after.status === "cancelled" && before.status === "accepted" && before.riderUid) {
            await pushUids([before.riderUid], {
                title: "Ride cancelled",
                body: `${rideRequestBody(rideOf(before))} was cancelled by the user.`,
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
                    riderPhoneMasked: FieldValue.delete(),
                    riderRating: FieldValue.delete(),
                    riderRatingCount: FieldValue.delete(),
                    acceptedAt: FieldValue.delete(),
                    userConfirmedAt: FieldValue.delete(),
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
            ...requestPush(data, "Scheduled ride needs a pilot"),
            ttl: schedule.reminderMinutes * 60,
        });

    switch (action) {
        case "broadcast":
            await rebroadcast();
            break;
        case "remind":
            await pushUids([data.riderUid], {
                title: "Confirm your scheduled ride",
                body: `${ride.pickupName} → ${ride.dropName} at ${when}. Confirm within ${schedule.confirmMinutes} min or it goes to other pilots.`,
                tag: "ride-confirm",
                ttl: schedule.confirmMinutes * 60,
            });
            break;
        case "release":
            await Promise.all([
                pushUids([data.riderUid], {
                    title: "Ride released",
                    body: `You didn't confirm ${ride.pickupName} → ${ride.dropName} at ${when}, so it went to other pilots.`,
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

const WAITLISTED_CAMPUSES = ["PTU", "PIMS"] as const;

/** Public counters for the booking page and admin; merge keeps other writers' fields. */
async function writeRideStats(fields: Record<string, unknown>) {
    await db
        .collection("site_content")
        .doc("rides_stats")
        .set({ ...fields, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

async function refreshRideStats() {
    const [riders, online, completed] = await Promise.all([
        db.collection("riders").where("status", "==", "approved").count().get(),
        db
            .collection("riders")
            .where("status", "==", "approved")
            .where("online", "==", true)
            .count()
            .get(),
        db.collection("ride_requests").where("status", "==", "completed").count().get(),
    ]);
    await writeRideStats({
        totalRiders: riders.data().count,
        onlineRiders: online.data().count,
        completedRides: completed.data().count,
    });
}

async function refreshWaitlistStats() {
    const snap = await db.collection("ride_waitlist").get();
    await writeRideStats({
        waitlist: waitlistByCampus(
            WAITLISTED_CAMPUSES,
            snap.docs.map((doc) => doc.data())
        ),
    });
}

/** Keeps the public rider and completed-ride counts in step with the riders. */
export const rideStats = onDocumentWritten("riders/{uid}", async () => {
    await refreshRideStats();
});

/** Keeps the completed-ride count in step once a ride finishes (or an old one is removed). */
export const rideCompletionStats = onDocumentWritten("ride_requests/{requestId}", async (event) => {
    if (completionChanged(event.data?.before.data(), event.data?.after.data())) {
        await refreshRideStats();
    }
});

/** Keeps each waitlisted campus's demand count in step with its sign-ups. */
export const rideWaitlistStats = onDocumentWritten("ride_waitlist/{uid}", async () => {
    await refreshWaitlistStats();
});

/** Recomputes the counters now and then, so a missed trigger or a first deploy catches up. */
export const refreshRideStatsHourly = onSchedule(
    { schedule: "every 60 minutes", timeZone: IST_TIME_ZONE },
    async () => {
        await Promise.all([refreshRideStats(), refreshWaitlistStats()]);
    }
);

/**
 * Drops a ride now nobody accepted within AUTO_CANCEL_MINUTES and tells the
 * user, so a stale request doesn't sit on every rider's dashboard.
 */
export const cancelStaleRideNows = onSchedule(
    { schedule: "every 1 minutes", timeZone: IST_TIME_ZONE },
    async () => {
        const now = new Date();
        const cutoff = Timestamp.fromMillis(now.getTime() - AUTO_CANCEL_MINUTES * 60_000);
        const snap = await db
            .collection("ride_requests")
            .where("status", "==", "pending")
            .where("createdAt", "<=", cutoff)
            .get();

        await Promise.allSettled(
            snap.docs.map(async (doc) => {
                // Re-read in a transaction: a rider may have accepted it since the query.
                const expired = await db.runTransaction(async (tx) => {
                    const fresh = await tx.get(doc.ref);
                    if (fresh.get("status") !== "pending" || fresh.get("scheduledFor")) {
                        return false;
                    }
                    if (!isStaleRideNow(toDate(fresh.get("createdAt")), now)) return false;
                    tx.update(doc.ref, {
                        status: "expired",
                        expiredAt: Timestamp.fromDate(now),
                    });
                    return true;
                });
                if (!expired) return;

                const userId = doc.get("userId");
                if (!userId) return;
                await pushUids([userId], {
                    title: "No pilot found",
                    body: `${rideRequestBody(rideOf(doc.data()))} · Nobody took it in ${AUTO_CANCEL_MINUTES} minutes. Try again or offer a higher fare.`,
                    tag: "ride-expired",
                    ttl: 10 * 60,
                    targetUrl: USER_URL,
                });
            })
        );
    }
);

/**
 * Confirms an accepted ride for the user once their minute to cancel is up,
 * so the ride goes ahead even if they close the app.
 */
export const autoConfirmAcceptedRides = onSchedule(
    { schedule: "every 1 minutes", timeZone: IST_TIME_ZONE },
    async () => {
        const now = new Date();
        const cutoff = Timestamp.fromMillis(now.getTime() - USER_CONFIRM_MINUTES * 60_000);
        const snap = await db
            .collection("ride_requests")
            .where("status", "==", "accepted")
            .where("acceptedAt", "<=", cutoff)
            .get();

        await Promise.allSettled(
            snap.docs.map((doc) =>
                db.runTransaction(async (tx) => {
                    const fresh = await tx.get(doc.ref);
                    const due =
                        planUserConfirmation(
                            {
                                status: fresh.get("status"),
                                acceptedAt: toDate(fresh.get("acceptedAt")),
                                userConfirmedAt: toDate(fresh.get("userConfirmedAt")),
                            },
                            now
                        ) === "confirm";
                    if (!due) return;
                    tx.update(doc.ref, { userConfirmedAt: Timestamp.fromDate(now) });
                })
            )
        );
    }
);
