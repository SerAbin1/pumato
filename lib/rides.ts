import {
    addDaysToISTDateKey,
    formatISTDateKey,
    fromMinutes,
    IST_TIME_ZONE,
    istInstant,
    istNow,
} from "@/lib/ist";
import { format12h } from "@/lib/formatters";
import { WAITLISTED_CAMPUSES } from "@/lib/schemas/rides";
import type { RideFares, RidePlace, RideRequestStatus, RideSchedule } from "@/lib/types";

/** Short code the rider quotes in chat so the admin can find their application. */
export const riderRef = (uid: string) => uid.slice(0, 6).toUpperCase();

/** Approved pilots carry the `rider` custom claim; it is removed when they're revoked. */
export const isPilotClaim = (claims: Record<string, unknown> | null | undefined) =>
    claims?.rider === true;

/**
 * True when the rider is an approved pilot: the `rider` claim Firebase grants
 * them *and* an approved rider doc. The claim alone means nothing without approval.
 */
export const isApprovedPilot = (
    rider: { status?: string } | null | undefined,
    hasPilotClaim: boolean
) => hasPilotClaim && rider?.status === "approved";

export const riderVerificationMessage = (rider: { name: string; uid: string }) =>
    `Hi! I've applied to be a pilot on Pumato Rides.\n\nName: ${rider.name}\nRef: ${riderRef(rider.uid)}\n\nSharing my documents for verification.`;

/** Strips everything but digits, so "+91 90480 86503" works as a wa.me number. */
export const whatsappUrl = (number: string, text: string) =>
    `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/** Accepts the username with or without a leading "@". */
export const telegramUrl = (username: string, text: string) =>
    `https://t.me/${username.replace(/^@/, "")}?text=${encodeURIComponent(text)}`;

export const activePlaces = (places: RidePlace[]) => places.filter((p) => p.active);

/** The places a user on `campus` can book: that campus's, plus those on no campus. */
export const placesForCampus = (places: RidePlace[], campus: string | null | undefined) =>
    activePlaces(places).filter((p) => !p.campusId || p.campusId === campus);

/**
 * A route stays inside one campus, or between places on no campus: a campus as
 * a whole (e.g. "PU") is itself a place on no campus, for rides off it.
 */
const sameGroup = (a: RidePlace, b: RidePlace) => (a.campusId ?? null) === (b.campusId ?? null);

/** Where a user on `campus` can go from the pickup; all their places before one is picked. */
export const dropPlaces = (
    places: RidePlace[],
    campus: string | null | undefined,
    pickupId: string
) => {
    const options = placesForCampus(places, campus);
    const pickup = options.find((p) => p.id === pickupId);
    return pickup ? options.filter((p) => p.id !== pickupId && sameGroup(p, pickup)) : options;
};

/** Pairs of active places to price: a campus's own routes, or others' (null) between places on no campus. */
export const routesForCampus = (places: RidePlace[], campus: string | null) => {
    const group = activePlaces(places).filter((p) => (p.campusId ?? null) === campus);
    return group.flatMap((a, i) => group.slice(i + 1).map((b) => [a, b] as const));
};

/** Sorted, so A → B and B → A share one fare. */
export const routeKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** @returns the route's fare, or null if the admin hasn't priced it */
export const routeFare = (fares: RideFares, pickupId: string, dropId: string) =>
    fares[routeKey(pickupId, dropId)] ?? null;

/** Extra fare added when two passengers share a ride. */
export const PASSENGER_SURCHARGE = 10;

/** The route fare, plus the passenger surcharge for two passengers; null if unpriced. */
export const rideFare = (
    fares: RideFares,
    pickupId: string,
    dropId: string,
    passengers: number
) => {
    const base = routeFare(fares, pickupId, dropId);
    if (base === null) return null;
    return passengers === 2 ? base + PASSENGER_SURCHARGE : base;
};

/** Whether a place sits inside a university campus (rather than on no campus). */
export const isInUni = (place: RidePlace | null | undefined) => !!place?.campusId;

export const formatFare = (fare: number) => `₹${fare}`;

export const DEFAULT_RIDE_SCHEDULE: RideSchedule = {
    reminderMinutes: 30,
    confirmMinutes: 15,
    minLeadMinutes: 30,
    maxDaysAhead: 3,
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Whether a ride can be booked for `at`: past the minimum lead, within max days ahead. */
export const isSchedulable = (at: Date, now: Date, schedule: RideSchedule) =>
    scheduleProblem(at, now, schedule) === null;

/** Why a ride can't be booked for `at`, or null when it can. */
export const scheduleProblem = (at: Date, now: Date, schedule: RideSchedule) => {
    const lead = at.getTime() - now.getTime();
    if (lead < schedule.minLeadMinutes * MINUTE_MS) {
        return `Pick a time at least ${schedule.minLeadMinutes} min from now.`;
    }
    if (lead > schedule.maxDaysAhead * DAY_MS) {
        return `You can book up to ${schedule.maxDaysAhead} days ahead.`;
    }
    return null;
};

/** IST days ("YYYY-MM-DD") with at least one schedulable minute. */
export const bookableDates = (now: Date, schedule: RideSchedule) => {
    const today = istNow(now);
    return Array.from({ length: schedule.maxDaysAhead + 1 }, (_, i) =>
        formatISTDateKey(addDaysToISTDateKey(today, i))
    ).filter(
        (dateKey) =>
            isSchedulable(istInstant(dateKey, "23:59"), now, schedule) ||
            isSchedulable(istInstant(dateKey, "00:00"), now, schedule)
    );
};

const rideDayFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
});

/** "Sun 25 Oct, 4:30 PM", in IST. */
export const formatRideTime = (at: Date) =>
    `${rideDayFormatter.format(at)}, ${format12h(fromMinutes(istNow(at).timeInMinutes))}`;

/** A scheduled ride's time from its stored timestamp, or null for a ride now. */
export const scheduledTime = (ride: { scheduledFor?: { toDate: () => Date } }) =>
    ride.scheduledFor?.toDate() ?? null;

/** Whether a scheduled ride has reached its reminder time, when it's treated like a ride now. */
export const isDueSoon = (scheduledFor: Date, now: Date, schedule: RideSchedule) =>
    scheduledFor.getTime() - schedule.reminderMinutes * MINUTE_MS <= now.getTime();

/** A rider takes one ride at a time; a scheduled ride only counts once it's due. */
export const occupiesRider = (
    ride: { scheduledFor?: { toDate: () => Date } },
    now: Date,
    schedule: RideSchedule
) => {
    const at = scheduledTime(ride);
    return at === null || isDueSoon(at, now, schedule);
};

/** "Today", "Tomorrow", or "Mon 26 Oct" for an IST day ("YYYY-MM-DD"). */
export const formatDateOption = (dateKey: string, now: Date) => {
    const today = istNow(now);
    if (dateKey === formatISTDateKey(today)) return "Today";
    if (dateKey === formatISTDateKey(addDaysToISTDateKey(today, 1))) return "Tomorrow";
    return rideDayFormatter.format(istInstant(dateKey, "12:00"));
};

/** Where a scheduled ride stands, for the user who booked it. */
export const scheduledRideStatus = (ride: {
    status: RideRequestStatus;
    riderName?: string;
    broadcastAt?: unknown;
    riderConfirmedAt?: unknown;
}) => {
    switch (ride.status) {
        case "pending":
            return ride.broadcastAt ? "Looking for a pilot now" : "Waiting for a pilot";
        case "accepted":
            return `${ride.riderConfirmedAt ? "Confirmed" : "Accepted"} by ${ride.riderName}`;
        case "completed":
            return "Completed";
        case "cancelled":
            return "Cancelled";
        case "expired":
            return "No pilot found";
    }
};

type Stamp = { toDate: () => Date };

type MyRide = {
    status: RideRequestStatus;
    scheduledFor?: Stamp;
    // Null until the server stamps a ride just booked.
    createdAt?: Stamp | null;
};

/** When the ride happens: its scheduled time, or when a ride now was booked. */
export const rideTime = (ride: MyRide, now: Date) =>
    scheduledTime(ride) ?? ride.createdAt?.toDate() ?? now;

/** A ride now nobody took on its day: riders only see today's, and nothing marks it expired. */
export const isUnclaimed = (ride: MyRide, now: Date) =>
    ride.status === "pending" &&
    !ride.scheduledFor &&
    !!ride.createdAt &&
    formatISTDateKey(istNow(ride.createdAt.toDate())) < formatISTDateKey(istNow(now));

/** Where any of the user's rides stands, ride now or scheduled. */
export const rideStatus = (ride: MyRide & Parameters<typeof scheduledRideStatus>[0], now: Date) =>
    isUnclaimed(ride, now) ? "No pilot found" : scheduledRideStatus(ride);

/** Still waiting for, or with, a rider. */
export const isOpenRide = (ride: MyRide, now: Date) =>
    (ride.status === "pending" || ride.status === "accepted") && !isUnclaimed(ride, now);

/** The user's rides still under way, latest first, and the rest, latest first. */
export const splitMyRides = <T extends MyRide>(rides: T[], now: Date) => {
    const byTime = (a: T, b: T) => rideTime(a, now).getTime() - rideTime(b, now).getTime();
    return {
        current: rides.filter((r) => isOpenRide(r, now)).sort((a, b) => byTime(b, a)),
        past: rides.filter((r) => !isOpenRide(r, now)).sort((a, b) => byTime(b, a)),
    };
};

/** "2 passengers", or null for a single passenger (the usual case, so not worth a badge). */
export const passengersLabel = (passengers: number | undefined) =>
    passengers && passengers > 1 ? `${passengers} passengers` : null;

/** A Google Maps link to the user's pin; a plain search URL, so no API key. */
export const pickupMapsUrl = ({ lat, lng }: { lat: number; lng: number }) =>
    `https://maps.google.com/?q=${lat},${lng}`;

/** "±25 m", or "±1.8 km" for a rough fix (a laptop on Wi-Fi). */
export const pickupAccuracyLabel = (metres: number) =>
    metres < 1000 ? `±${Math.round(metres)} m` : `±${(metres / 1000).toFixed(1)} km`;

/** The rider's average stars to one decimal, or null before their first rating. */
export const averageRating = ({
    ratingSum = 0,
    ratingCount = 0,
}: {
    ratingSum?: number;
    ratingCount?: number;
}) => (ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null);

/** Fare bumps a user can offer to attract riders, in rupees. */
export const FARE_OFFER_STEPS = [5, 10, 15] as const;

/** Campuses that take a waitlist instead of ride bookings. */
export const isWaitlistedCampus = (campus: string | null | undefined): boolean =>
    !!campus && (WAITLISTED_CAMPUSES as readonly string[]).includes(campus);

/**
 * "98******10": enough for the user to recognise the rider's number, not enough
 * to read it. Mirrors maskPhone in functions/src/ride-flow.ts.
 */
export const maskPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length <= 4) return "*".repeat(digits.length);
    return `${digits.slice(0, 2)}${"*".repeat(digits.length - 4)}${digits.slice(-2)}`;
};

/** How long the user has to cancel after a rider accepts; otherwise it confirms. */
export const USER_CONFIRM_MS = 60_000;

/** When a rider's acceptance auto-confirms, from the stored timestamp. */
export const userConfirmDeadline = (ride: { acceptedAt?: { toDate?: () => Date } | null }) =>
    ride.acceptedAt?.toDate?.()
        ? new Date(ride.acceptedAt.toDate().getTime() + USER_CONFIRM_MS)
        : null;

/** Seconds left in the confirm window, or null once it has passed or there's nothing to confirm. */
export const secondsToConfirm = (
    ride: { acceptedAt?: { toDate?: () => Date } | null; userConfirmedAt?: unknown },
    now: Date
) => {
    if (ride.userConfirmedAt) return null;
    const deadline = userConfirmDeadline(ride);
    if (!deadline) return null;
    const left = Math.ceil((deadline.getTime() - now.getTime()) / 1000);
    return left > 0 ? left : null;
};

/**
 * Whether the user may still cancel their ride. Freely while it waits for a
 * pilot (until a scheduled ride's time), only inside the minute-long confirm
 * window once a rider has accepted, and never once the ride is confirmed —
 * confirmed rides are completed rides, and the rules refuse those too.
 */
export const userCanCancel = (
    ride: {
        status: RideRequestStatus;
        createdAt?: Stamp | null;
        scheduledFor?: Stamp;
        acceptedAt?: { toDate?: () => Date } | null;
        userConfirmedAt?: unknown;
    },
    now: Date
): boolean => {
    if (ride.status === "accepted") return secondsToConfirm(ride, now) !== null;
    if (ride.status !== "pending") return false;
    // A ride now nobody took shows as "No pilot found" rather than open.
    if (isUnclaimed(ride, now)) return false;
    const at = scheduledTime(ride);
    return !at || at > now;
};

/** Support mailbox both the ride's Report and Feedback buttons point at. */
export const FEEDBACK_EMAIL = "pumato.feedbacks@gmail.com";

/** A mailto: link prefilled with the ride, so the admin can trace the message. */
export const rideFeedbackUrl = (
    kind: "report" | "feedback",
    ride: { id: string; pickupName: string; dropName: string; fare: number | null | undefined },
    sentAt = new Date()
): string => {
    const subject = kind === "report" ? "Ride report" : "Pumato feedback";
    const body = [
        `Ride id: ${ride.id}`,
        `Route: ${ride.pickupName} → ${ride.dropName}`,
        ...(ride.fare ? [`Fare: ₹${ride.fare}`] : []),
        `Date: ${formatRideTime(sentAt)}`,
        "",
    ].join("\n");
    return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

/** How long a ride-now request waits for a pilot before the sweep cancels it. */
export const AUTO_CANCEL_MINUTES = 7;

/** Seconds left before a deadline, or null once it has passed. */
const secondsLeftOf = (deadline: Date, now: Date) => {
    const left = Math.ceil((deadline.getTime() - now.getTime()) / 1000);
    return left > 0 ? left : null;
};

/** When a pending ride-now nobody took is auto-cancelled, from the stored booking time. */
export const autoCancelDeadline = (ride: { createdAt?: { toDate?: () => Date } | null }) =>
    ride.createdAt?.toDate?.()
        ? new Date(ride.createdAt.toDate().getTime() + AUTO_CANCEL_MINUTES * 60_000)
        : null;

/** Seconds left before the sweep cancels a pending ride-now, or null when there's no window. */
export const secondsToCancel = (
    ride: {
        status?: string;
        scheduledFor?: { toDate?: () => Date } | null;
        createdAt?: { toDate?: () => Date } | null;
    },
    now: Date
) => {
    if (ride.status !== "pending" || ride.scheduledFor) return null;
    const deadline = autoCancelDeadline(ride);
    return deadline ? secondsLeftOf(deadline, now) : null;
};

/** Seconds left before a ride-now gets auto-cancelled, from when it was requested. */
export const secondsToAutoCancel = (createdAt: Date | null | undefined, now: Date) =>
    createdAt
        ? secondsLeftOf(new Date(createdAt.getTime() + AUTO_CANCEL_MINUTES * 60_000), now)
        : null;

/** "7:00" for a seconds-left countdown; sub-hour windows read m:ss. */
export const formatCountdown = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * A rider's requests: live is scheduled rides that are due, then rides now;
 * later is scheduled rides they can claim ahead.
 */
export const splitRequests = <T extends { scheduledFor?: { toDate: () => Date } }>(
    rideNow: T[],
    upcoming: T[],
    now: Date,
    schedule: RideSchedule
) => {
    const isDue = (r: T) => isDueSoon(scheduledTime(r)!, now, schedule);
    return {
        live: [...upcoming.filter(isDue), ...rideNow],
        later: upcoming.filter((r) => !isDue(r)),
    };
};
