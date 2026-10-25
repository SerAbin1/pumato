import { describe, it, expect } from "vite-plus/test";
import {
    addLocalRide,
    addSyncedRides,
    EMPTY_COMPLETED_RIDES,
    formatWeek,
    parseCompletedRides,
    toCompletedRide,
    weekOf,
    weeklyEarnings,
} from "@/lib/riderRides";
import { istInstant } from "@/lib/ist";

// Sat 24 Oct 2026, 22:10 IST.
const now = istInstant("2026-10-24", "22:10");

const ride = (id: string, completedAt: Date, fare: number | null = 20) => ({
    id,
    pickupName: "Gate 1",
    dropName: "Library",
    fare,
    passengers: 1,
    guestName: "Asha",
    completedAt: completedAt.getTime(),
});

describe("toCompletedRide", () => {
    it("keeps what the rider's history and earnings need", () => {
        const at = istInstant("2026-10-24", "21:00");
        expect(
            toCompletedRide({
                id: "r1",
                name: "Asha",
                pickupName: "Gate 1",
                dropName: "Library",
                fare: 20,
                completedAt: { toDate: () => at },
            })
        ).toEqual(ride("r1", at));
    });

    it("counts a ride booked before passengers existed as one", () => {
        const at = istInstant("2026-10-24", "21:00");
        expect(
            toCompletedRide({
                id: "r1",
                name: "Asha",
                pickupName: "Gate 1",
                dropName: "Library",
                fare: 20,
                passengers: 2,
                completedAt: { toDate: () => at },
            }).passengers
        ).toBe(2);
    });
});

describe("parseCompletedRides", () => {
    it("reads back a saved cache", () => {
        const cache = { syncedTo: 5, rides: [ride("r1", now)] };
        expect(parseCompletedRides(JSON.stringify(cache))).toEqual(cache);
    });

    it("starts over when storage is missing or broken", () => {
        expect(parseCompletedRides(null)).toEqual(EMPTY_COMPLETED_RIDES);
        expect(parseCompletedRides("{nope")).toEqual(EMPTY_COMPLETED_RIDES);
        expect(parseCompletedRides(JSON.stringify({ rides: "x" }))).toEqual(EMPTY_COMPLETED_RIDES);
    });
});

describe("merging completed rides", () => {
    const earlier = istInstant("2026-10-24", "18:00");
    const later = istInstant("2026-10-24", "20:00");

    it("moves the sync point to the latest ride the server returned", () => {
        const cache = addSyncedRides(EMPTY_COMPLETED_RIDES, [ride("a", earlier), ride("b", later)]);
        expect(cache.syncedTo).toBe(later.getTime());
        expect(cache.rides.map((r) => r.id)).toEqual(["b", "a"]);
    });

    it("keeps the sync point when the server returned nothing new", () => {
        const cache = addSyncedRides({ syncedTo: 7, rides: [] }, []);
        expect(cache.syncedTo).toBe(7);
    });

    it("adds a ride the rider just completed without moving the sync point", () => {
        // The device clock may run ahead; the next sync fetches it with the server's time.
        const synced = addSyncedRides(EMPTY_COMPLETED_RIDES, [ride("a", earlier)]);
        const cache = addLocalRide(synced, ride("b", later));
        expect(cache.syncedTo).toBe(earlier.getTime());
        expect(cache.rides.map((r) => r.id)).toEqual(["b", "a"]);
    });

    it("replaces the local copy once the server's arrives", () => {
        const local = addLocalRide(EMPTY_COMPLETED_RIDES, ride("a", later));
        const server = istInstant("2026-10-24", "19:59");
        const cache = addSyncedRides(local, [ride("a", server)]);
        expect(cache.rides).toEqual([ride("a", server)]);
    });

    it("keeps the latest 200 rides", () => {
        const many = Array.from({ length: 205 }, (_, i) => ride(`r${i}`, new Date(i * 1000)));
        const cache = addSyncedRides(EMPTY_COMPLETED_RIDES, many);
        expect(cache.rides).toHaveLength(200);
        expect(cache.rides[0].id).toBe("r204");
    });
});

describe("weekly earnings", () => {
    it("runs Monday to Sunday in IST", () => {
        const { start, end } = weekOf(now);
        expect(start).toEqual(istInstant("2026-10-19", "00:00"));
        expect(end).toEqual(istInstant("2026-10-26", "00:00"));
        expect(formatWeek(now)).toBe("19 Oct – 25 Oct");
    });

    it("starts the week on Monday itself", () => {
        expect(weekOf(istInstant("2026-10-19", "00:30")).start).toEqual(
            istInstant("2026-10-19", "00:00")
        );
    });

    it("adds up this week's fares and counts rides on unpriced routes apart", () => {
        const rides = [
            ride("a", istInstant("2026-10-24", "21:00"), 30),
            ride("b", istInstant("2026-10-19", "08:00"), 20),
            ride("c", istInstant("2026-10-20", "09:00"), null),
            // Sunday night, last week.
            ride("old", istInstant("2026-10-18", "23:30"), 50),
        ];
        expect(weeklyEarnings(rides, now)).toEqual({ total: 50, count: 3, unpriced: 1 });
    });
});
