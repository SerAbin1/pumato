/**
 * The rider's completed rides, cached in their browser so history and earnings
 * cost only the rides completed since the last visit. Pure; the page does the
 * storage and the fetching.
 */
import {
    addDaysToISTDateKey,
    formatISTDateKey,
    IST_TIME_ZONE,
    istInstant,
    istNow,
} from "@/lib/ist";
import { CompletedRidesCacheSchema } from "@/lib/schemas/rides";
import type { CompletedRide, CompletedRidesCache } from "@/lib/types";

const MAX_CACHED_RIDES = 200;
const WEEK_MS = 7 * 24 * 60 * 60_000;

export const EMPTY_COMPLETED_RIDES: CompletedRidesCache = { syncedTo: null, rides: [] };

export const completedRidesKey = (uid: string) => `pumato_rider_rides_${uid}`;

export const toCompletedRide = (ride: {
    id: string;
    name: string;
    pickupName: string;
    dropName: string;
    fare: number | null;
    // Absent on requests booked before the option existed: one passenger.
    passengers?: number;
    completedAt: { toDate: () => Date };
}): CompletedRide => ({
    id: ride.id,
    pickupName: ride.pickupName,
    dropName: ride.dropName,
    fare: ride.fare,
    passengers: ride.passengers ?? 1,
    guestName: ride.name,
    completedAt: ride.completedAt.toDate().getTime(),
});

/** The saved cache, or an empty one when storage is missing or broken. */
export const parseCompletedRides = (raw: string | null): CompletedRidesCache => {
    try {
        const parsed = CompletedRidesCacheSchema.safeParse(JSON.parse(raw ?? "null"));
        return parsed.success ? parsed.data : EMPTY_COMPLETED_RIDES;
    } catch {
        return EMPTY_COMPLETED_RIDES;
    }
};

/** Newer copies replace older ones by id; latest first, capped. */
const merge = (rides: CompletedRide[], incoming: CompletedRide[]) => {
    const ids = new Set(incoming.map((r) => r.id));
    return [...incoming, ...rides.filter((r) => !ids.has(r.id))]
        .sort((a, b) => b.completedAt - a.completedAt)
        .slice(0, MAX_CACHED_RIDES);
};

/** Rides fetched from the server: their times are the server's, so the sync point moves. */
export const addSyncedRides = (
    cache: CompletedRidesCache,
    rides: CompletedRide[]
): CompletedRidesCache => ({
    syncedTo: rides.reduce<number | null>(
        (latest, r) => Math.max(latest ?? r.completedAt, r.completedAt),
        cache.syncedTo
    ),
    rides: merge(cache.rides, rides),
});

/**
 * A ride the rider just completed here, timed by this device. The sync point
 * stays, so a clock running ahead can't skip a ride; the next sync refetches it.
 */
export const addLocalRide = (cache: CompletedRidesCache, ride: CompletedRide) => ({
    syncedTo: cache.syncedTo,
    rides: merge(cache.rides, [ride]),
});

/** Monday 00:00 IST to the next Monday. */
export const weekOf = (now: Date) => {
    const today = istNow(now);
    // getUTCDay on the IST date itself: 0 is Sunday.
    const weekday = new Date(Date.UTC(today.year, today.month, today.day)).getUTCDay();
    const monday = addDaysToISTDateKey(today, -((weekday + 6) % 7));
    const start = istInstant(formatISTDateKey(monday), "00:00");
    return { start, end: new Date(start.getTime() + WEEK_MS) };
};

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    day: "numeric",
    month: "short",
});

/** "19 Oct – 25 Oct" */
export const formatWeek = (now: Date) => {
    const { start, end } = weekOf(now);
    return `${dayFormatter.format(start)} – ${dayFormatter.format(new Date(end.getTime() - 1))}`;
};

/** This week's fares; rides on routes with no set fare can't be added, so they're counted apart. */
export const weeklyEarnings = (rides: CompletedRide[], now: Date) => {
    const { start, end } = weekOf(now);
    const week = rides.filter(
        (r) => r.completedAt >= start.getTime() && r.completedAt < end.getTime()
    );
    return {
        total: week.reduce((sum, r) => sum + (r.fare ?? 0), 0),
        count: week.length,
        unpriced: week.filter((r) => r.fare === null).length,
    };
};
