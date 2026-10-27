/**
 * Pumato Rides decisions for the backend: what the sweep does to a scheduled
 * ride, and who hears about a request. Pure, with no Firebase imports.
 */

import { IST_TIME_ZONE } from "./ist";

const MINUTE_MS = 60_000;

// A scheduled ride nobody took is dropped this long after its time.
const EXPIRE_AFTER_MS = 60 * MINUTE_MS;

/** Mirrors DEFAULT_RIDE_SCHEDULE in lib/rides.ts, for settings saved before it existed. */
export const DEFAULT_SCHEDULE: SweepSchedule = { reminderMinutes: 30, confirmMinutes: 15 };

export interface SweepSchedule {
    reminderMinutes: number;
    confirmMinutes: number;
}

/** A scheduled ride as the sweep reads it, timestamps already converted. */
export interface SweepRide {
    status: "pending" | "accepted";
    scheduledFor: Date;
    acceptedAt?: Date;
    broadcastAt?: Date;
    confirmRequestedAt?: Date;
    riderConfirmedAt?: Date;
}

export type SweepAction = "broadcast" | "remind" | "autoConfirm" | "release" | "expire";

/**
 * What the sweep should do to a scheduled ride now, or null.
 *
 * From `reminderMinutes` before the ride, an unclaimed ride is pushed to
 * online riders again, and the accepted rider is asked to confirm. A rider who
 * doesn't confirm within `confirmMinutes` loses it, and it goes back to everyone.
 */
export function planScheduledRide(
    ride: SweepRide,
    now: Date,
    schedule: SweepSchedule
): SweepAction | null {
    const t = now.getTime();
    const reminderAt = ride.scheduledFor.getTime() - schedule.reminderMinutes * MINUTE_MS;

    if (ride.status === "pending") {
        if (t >= ride.scheduledFor.getTime() + EXPIRE_AFTER_MS) return "expire";
        if (!ride.broadcastAt && t >= reminderAt) return "broadcast";
        return null;
    }

    if (ride.riderConfirmedAt) return null;
    if (ride.confirmRequestedAt) {
        const deadline = ride.confirmRequestedAt.getTime() + schedule.confirmMinutes * MINUTE_MS;
        return t >= deadline ? "release" : null;
    }
    if (t < reminderAt) return null;
    // Taking the ride this close to its time is confirmation enough.
    return ride.acceptedAt && ride.acceptedAt.getTime() >= reminderAt ? "autoConfirm" : "remind";
}

export type RidePreference = "any" | "female";

/**
 * Which riders a push goes to: those on the request's campus; `notFemale` skips
 * those a female-only request already reached.
 */
export interface PushAudience {
    campusId: string;
    onlineOnly: boolean;
    gender: "any" | "female" | "notFemale";
}

/**
 * - `new`: a request was just booked.
 * - `widened`: the user dropped the female-rider preference.
 * - `rebroadcast`: the sweep is looking for a rider near a scheduled ride's time.
 *
 * A scheduled ride is far enough off that offline riders hear about it too.
 */
export function pushAudience(
    reason: "new" | "widened" | "rebroadcast",
    ride: { riderPreference?: RidePreference; scheduled?: boolean; campusId: string }
): PushAudience {
    const { campusId } = ride;
    const onlineOnly = reason === "rebroadcast" || !ride.scheduled;
    if (reason === "widened") return { campusId, onlineOnly, gender: "notFemale" };
    return { campusId, onlineOnly, gender: ride.riderPreference === "female" ? "female" : "any" };
}

/** Whether a rider matches a push audience. */
export const inAudience = (rider: { gender?: string }, gender: PushAudience["gender"]) =>
    gender === "any" || (gender === "female") === (rider.gender === "female");

const rideDayFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
});
const rideTimeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

/** "Sun 25 Oct, 4:30 PM", in IST; matches formatRideTime in lib/rides.ts. */
export const formatRideTime = (at: Date) =>
    `${rideDayFormatter.format(at)}, ${rideTimeFormatter.format(at)}`;

/** The notification body for a ride request. */
export function rideRequestBody(ride: {
    pickupName: string;
    dropName: string;
    fare?: number | null;
    scheduledFor?: Date;
    riderPreference?: RidePreference;
    passengers?: number;
}): string {
    return [
        `${ride.pickupName} → ${ride.dropName}`,
        ride.passengers && ride.passengers > 1 ? `${ride.passengers} passengers` : null,
        ride.fare ? `₹${ride.fare}` : null,
        ride.scheduledFor ? formatRideTime(ride.scheduledFor) : null,
        ride.riderPreference === "female" ? "Female rider requested" : null,
    ]
        .filter(Boolean)
        .join(" · ");
}

interface AvailabilityRider {
    status?: string;
    gender?: string;
    online?: boolean;
    campusId?: string;
}

const availabilityKey = (r: AvailabilityRider | undefined) =>
    r?.status === "approved" && r.gender === "female"
        ? `${r.campusId}:${r.online ? "online" : "approved"}`
        : "none";

/** Whether a rider doc change can move a campus's female availability flags. */
export const affectsAvailability = (
    before: AvailabilityRider | undefined,
    after: AvailabilityRider | undefined
) => availabilityKey(before) !== availabilityKey(after);

export interface CampusAvailability {
    femaleApproved: boolean;
    femaleOnline: boolean;
}

/** Each campus's flags from its approved female riders; a campus with none is left out. */
export function availabilityByCampus(femaleRiders: { campusId: string; online?: boolean }[]) {
    const byCampus: Record<string, CampusAvailability> = {};
    for (const { campusId, online } of femaleRiders) {
        const flags = (byCampus[campusId] ??= { femaleApproved: true, femaleOnline: false });
        if (online) flags.femaleOnline = true;
    }
    return byCampus;
}

/** Mirrors RideRatingSchema in lib/schemas/rides.ts. */
const isRating = (value: unknown): value is number =>
    Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;

/** The rating to add to a rider's total when a user first rates their ride, or null. */
export function newRating(
    before: Record<string, unknown>,
    after: Record<string, unknown>
): { riderUid: string; rating: number } | null {
    if (before.rating !== undefined || !isRating(after.rating)) return null;
    if (typeof after.riderUid !== "string") return null;
    return { riderUid: after.riderUid, rating: after.rating };
}
