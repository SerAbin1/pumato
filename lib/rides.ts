import {
    addDaysToISTDateKey,
    formatISTDateKey,
    fromMinutes,
    IST_TIME_ZONE,
    istInstant,
    istNow,
} from "@/lib/ist";
import { format12h } from "@/lib/formatters";
import { GuestRideSchema } from "@/lib/schemas/rides";
import type { GuestRide, RideFares, RidePlace, RideRequestStatus, RideSchedule } from "@/lib/types";

/** Short code the rider quotes in chat so the admin can find their application. */
export const riderRef = (uid: string) => uid.slice(0, 6).toUpperCase();

export const riderVerificationMessage = (rider: { name: string; uid: string }) =>
    `Hi! I've applied to be a rider on Pumato Rides.\n\nName: ${rider.name}\nRef: ${riderRef(rider.uid)}\n\nSharing my documents for verification.`;

/** Strips everything but digits, so "+91 90480 86503" works as a wa.me number. */
export const whatsappUrl = (number: string, text: string) =>
    `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/** Accepts the username with or without a leading "@". */
export const telegramUrl = (username: string, text: string) =>
    `https://t.me/${username.replace(/^@/, "")}?text=${encodeURIComponent(text)}`;

export const activePlaces = (places: RidePlace[]) => places.filter((p) => p.active);

/** Sorted, so A → B and B → A share one fare. */
export const routeKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** @returns the route's fare, or null if the admin hasn't priced it */
export const routeFare = (fares: RideFares, pickupId: string, dropId: string) =>
    fares[routeKey(pickupId, dropId)] ?? null;

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
            return ride.broadcastAt ? "Looking for a rider now" : "Waiting for a rider";
        case "accepted":
            return `${ride.riderConfirmedAt ? "Confirmed" : "Accepted"} by ${ride.riderName}`;
        case "completed":
            return "Completed";
        case "cancelled":
            return "Cancelled";
        case "expired":
            return "No rider found";
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
    isUnclaimed(ride, now) ? "No rider found" : scheduledRideStatus(ride);

/** Still waiting for, or with, a rider. */
export const isOpenRide = (ride: MyRide, now: Date) =>
    (ride.status === "pending" || ride.status === "accepted") && !isUnclaimed(ride, now);

/** The user's rides still under way, soonest first, and the rest, latest first. */
export const splitMyRides = <T extends MyRide>(rides: T[], now: Date) => {
    const byTime = (a: T, b: T) => rideTime(a, now).getTime() - rideTime(b, now).getTime();
    return {
        current: rides.filter((r) => isOpenRide(r, now)).sort(byTime),
        past: rides.filter((r) => !isOpenRide(r, now)).sort((a, b) => byTime(b, a)),
    };
};

const MAX_GUEST_RIDES = 5;

/**
 * A guest's saved rides from storage, keeping only today's: riders stop seeing
 * a ride now after its day. Broken storage or entries just read as none.
 */
export const parseGuestRides = (raw: string | null, now: Date): GuestRide[] => {
    let saved: unknown;
    try {
        saved = JSON.parse(raw ?? "[]");
    } catch {
        return [];
    }
    if (!Array.isArray(saved)) return [];
    const today = formatISTDateKey(istNow(now));
    return saved.flatMap((entry) => {
        const parsed = GuestRideSchema.safeParse(entry);
        return parsed.success && formatISTDateKey(istNow(new Date(parsed.data.createdAt))) === today
            ? [parsed.data]
            : [];
    });
};

/** Newest first, keeping the last few. */
export const addGuestRide = (rides: GuestRide[], ride: GuestRide) =>
    [ride, ...rides.filter((r) => r.id !== ride.id)].slice(0, MAX_GUEST_RIDES);

/** "2 passengers", or null for a single passenger (the usual case, so not worth a badge). */
export const passengersLabel = (passengers: number | undefined) =>
    passengers && passengers > 1 ? `${passengers} passengers` : null;

/** A Google Maps link to the guest's pin; a plain search URL, so no API key. */
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
