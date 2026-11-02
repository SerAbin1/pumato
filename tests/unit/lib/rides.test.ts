import { describe, it, expect } from "vite-plus/test";
import {
    averageRating,
    bookableDates,
    dropPlaces,
    DEFAULT_RIDE_SCHEDULE,
    formatDateOption,
    formatRideTime,
    isDueSoon,
    isSchedulable,
    isWaitlistedCampus,
    maskPhone,
    occupiesRider,
    pickupAccuracyLabel,
    pickupMapsUrl,
    placesForCampus,
    rideStatus,
    routesForCampus,
    scheduledTime,
    secondsToConfirm,
    splitRequests,
    riderRef,
    routeFare,
    routeKey,
    scheduleProblem,
    scheduledRideStatus,
    splitMyRides,
    telegramUrl,
    whatsappUrl,
} from "@/lib/rides";
import { istInstant } from "@/lib/ist";
import type { RideRequestStatus } from "@/lib/types";

describe("rider contact links", () => {
    it("builds a wa.me link from a number typed with spaces and a plus", () => {
        expect(whatsappUrl("+91 90480 86503", "hi there")).toBe(
            "https://wa.me/919048086503?text=hi%20there"
        );
    });

    it("builds a t.me link whether or not the username has an @", () => {
        expect(telegramUrl("@pumato", "hi")).toBe("https://t.me/pumato?text=hi");
        expect(telegramUrl("pumato", "hi")).toBe("https://t.me/pumato?text=hi");
    });

    it("gives a rider a short uppercase ref from their uid", () => {
        expect(riderRef("abc123xyz")).toBe("ABC123");
    });
});

describe("route fares", () => {
    it("gives both directions of a route the same key", () => {
        expect(routeKey("gate", "lib")).toBe(routeKey("lib", "gate"));
    });

    it("looks up a priced route either way round", () => {
        const fares = { [routeKey("gate", "lib")]: 20 };
        expect(routeFare(fares, "gate", "lib")).toBe(20);
        expect(routeFare(fares, "lib", "gate")).toBe(20);
    });

    it("returns null for a route with no fare", () => {
        expect(routeFare({}, "gate", "lib")).toBeNull();
    });
});

describe("placesForCampus", () => {
    const places = [
        { id: "pu-gate", name: "PU Gate", active: true, campusId: "PU" },
        { id: "ptu-gate", name: "PTU Gate", active: true, campusId: "PTU" },
        { id: "pu-old", name: "PU Old Block", active: false, campusId: "PU" },
        { id: "station", name: "Railway Station", active: true },
    ];
    const ids = (campus: string | null | undefined) =>
        placesForCampus(places, campus).map((p) => p.id);

    it("shows the campus's places and the campus-less ones", () => {
        expect(ids("PU")).toEqual(["pu-gate", "station"]);
        expect(ids("PTU")).toEqual(["ptu-gate", "station"]);
    });

    it("shows only campus-less places before a campus is picked", () => {
        expect(ids(null)).toEqual(["station"]);
        expect(ids("")).toEqual(["station"]);
    });
});

describe("routesForCampus", () => {
    const place = (id: string, campusId?: string, active = true) => ({
        id,
        name: id,
        active,
        campusId,
    });
    const places = [
        place("pu1", "PU"),
        place("pu2", "PU"),
        place("ptu1", "PTU"),
        place("ptu2", "PTU"),
        place("station"),
        place("bus"),
        place("hidden", "PU", false),
    ];
    const keys = (campus: string | null) =>
        routesForCampus(places, campus).map(([a, b]) => `${a.id}-${b.id}`);

    it("gives a campus only the routes between its own places", () => {
        expect(keys("PU")).toEqual(["pu1-pu2"]);
        expect(keys("PTU")).toEqual(["ptu1-ptu2"]);
    });

    it("gives others only the routes between places on no campus", () => {
        expect(keys(null)).toEqual(["station-bus"]);
    });
});

describe("dropPlaces", () => {
    const places = [
        { id: "sj", name: "SJ", active: true, campusId: "PU" },
        { id: "gate1", name: "Gate 1", active: true, campusId: "PU" },
        { id: "ptu-gate", name: "PTU Gate", active: true, campusId: "PTU" },
        { id: "pu", name: "PU", active: true },
        { id: "station", name: "Railway Station", active: true },
    ];
    const ids = (pickupId: string) => dropPlaces(places, "PU", pickupId).map((p) => p.id);

    it("keeps a ride from a campus place inside that campus", () => {
        expect(ids("sj")).toEqual(["gate1"]);
    });

    it("keeps a ride from a place on no campus among places on no campus", () => {
        expect(ids("pu")).toEqual(["station"]);
    });

    it("offers all of the campus's places before a pickup is picked", () => {
        expect(ids("")).toEqual(["sj", "gate1", "pu", "station"]);
    });
});

// 30 min lead, up to 3 days ahead.
const schedule = DEFAULT_RIDE_SCHEDULE;
// Sat 24 Oct 2026, 22:10 IST.
const now = istInstant("2026-10-24", "22:10");

describe("scheduling window", () => {
    it("refuses a time inside the minimum lead", () => {
        expect(isSchedulable(istInstant("2026-10-24", "22:30"), now, schedule)).toBe(false);
    });

    it("accepts a time exactly at the minimum lead", () => {
        expect(isSchedulable(istInstant("2026-10-24", "22:40"), now, schedule)).toBe(true);
    });

    it("accepts up to max days ahead, and not beyond", () => {
        expect(isSchedulable(istInstant("2026-10-27", "22:10"), now, schedule)).toBe(true);
        expect(isSchedulable(istInstant("2026-10-27", "22:15"), now, schedule)).toBe(false);
    });

    it("refuses a time in the past", () => {
        expect(isSchedulable(istInstant("2026-10-24", "09:00"), now, schedule)).toBe(false);
    });
});

describe("scheduleProblem", () => {
    it("asks for a time past the minimum lead", () => {
        expect(scheduleProblem(istInstant("2026-10-24", "22:30"), now, schedule)).toBe(
            "Pick a time at least 30 min from now."
        );
    });

    it("caps how far ahead a ride can be booked", () => {
        expect(scheduleProblem(istInstant("2026-10-27", "22:11"), now, schedule)).toBe(
            "You can book up to 3 days ahead."
        );
    });

    it("accepts any minute inside the window", () => {
        expect(scheduleProblem(istInstant("2026-10-24", "22:43"), now, schedule)).toBeNull();
    });
});

describe("bookable dates", () => {
    it("lists every IST day from today to the last bookable day", () => {
        expect(bookableDates(now, schedule)).toEqual([
            "2026-10-24",
            "2026-10-25",
            "2026-10-26",
            "2026-10-27",
        ]);
    });

    it("keeps today while a minute of it is still bookable", () => {
        const late = istInstant("2026-10-24", "23:20");
        expect(bookableDates(late, schedule)[0]).toBe("2026-10-24");
    });

    it("skips today once all of it is inside the lead", () => {
        const late = istInstant("2026-10-24", "23:30");
        expect(bookableDates(late, schedule)[0]).toBe("2026-10-25");
    });
});

describe("formatRideTime", () => {
    it("shows weekday, date and 12-hour IST time", () => {
        expect(formatRideTime(istInstant("2026-10-25", "16:30"))).toBe("Sun 25 Oct, 4:30 PM");
    });
});

describe("scheduled rides near their time", () => {
    const ride = istInstant("2026-10-25", "16:30");

    it("are due from the reminder time", () => {
        expect(isDueSoon(ride, istInstant("2026-10-25", "15:59"), schedule)).toBe(false);
        expect(isDueSoon(ride, istInstant("2026-10-25", "16:00"), schedule)).toBe(true);
    });

    it("occupy their rider only once due, while a ride now always does", () => {
        const early = istInstant("2026-10-25", "12:00");
        const due = istInstant("2026-10-25", "16:10");
        const scheduled = { scheduledFor: { toDate: () => ride } };
        expect(occupiesRider({}, early, schedule)).toBe(true);
        expect(occupiesRider(scheduled, early, schedule)).toBe(false);
        expect(occupiesRider(scheduled, due, schedule)).toBe(true);
    });

    it("read their time from the stored timestamp", () => {
        expect(scheduledTime({ scheduledFor: { toDate: () => ride } })).toEqual(ride);
        expect(scheduledTime({})).toBeNull();
    });
});

describe("formatDateOption", () => {
    it("names today and tomorrow, then shows the date", () => {
        expect(formatDateOption("2026-10-24", now)).toBe("Today");
        expect(formatDateOption("2026-10-25", now)).toBe("Tomorrow");
        expect(formatDateOption("2026-10-26", now)).toBe("Mon 26 Oct");
    });
});

describe("scheduledRideStatus", () => {
    const ts = { toDate: () => now };

    it("says whether the ride is still looking for a rider", () => {
        expect(scheduledRideStatus({ status: "pending" })).toBe("Waiting for a pilot");
        expect(scheduledRideStatus({ status: "pending", broadcastAt: ts })).toBe(
            "Looking for a pilot now"
        );
    });

    it("names the rider who took it, and whether they've confirmed", () => {
        expect(scheduledRideStatus({ status: "accepted", riderName: "Ravi" })).toBe(
            "Accepted by Ravi"
        );
        expect(
            scheduledRideStatus({ status: "accepted", riderName: "Ravi", riderConfirmedAt: ts })
        ).toBe("Confirmed by Ravi");
    });

    it("describes finished rides", () => {
        expect(scheduledRideStatus({ status: "completed" })).toBe("Completed");
        expect(scheduledRideStatus({ status: "cancelled" })).toBe("Cancelled");
        expect(scheduledRideStatus({ status: "expired" })).toBe("No pilot found");
    });
});

describe("a user's rides", () => {
    const at = (dateKey: string, hhmm: string) => ({ toDate: () => istInstant(dateKey, hhmm) });
    // now is 24 Oct, 22:10 IST.
    const rideNow = (status: RideRequestStatus, bookedOn = "2026-10-24", bookedAt = "21:00") => ({
        status,
        createdAt: at(bookedOn, bookedAt),
    });

    it("says nobody took a ride now still waiting from an earlier day", () => {
        expect(rideStatus(rideNow("pending", "2026-10-23"), now)).toBe("No pilot found");
        expect(rideStatus(rideNow("pending"), now)).toBe("Waiting for a pilot");
    });

    it("leaves accepted and scheduled rides as they stand", () => {
        expect(rideStatus({ ...rideNow("accepted", "2026-10-23"), riderName: "Ravi" }, now)).toBe(
            "Accepted by Ravi"
        );
        expect(
            rideStatus(
                {
                    status: "pending",
                    createdAt: at("2026-10-23", "10:00"),
                    scheduledFor: at("2026-10-25", "09:00"),
                },
                now
            )
        ).toBe("Waiting for a pilot");
    });

    it("splits current rides, soonest first, from past ones, latest first", () => {
        const waiting = { id: "waiting", ...rideNow("pending", "2026-10-24", "22:00") };
        const riding = { id: "riding", ...rideNow("accepted", "2026-10-24", "21:30") };
        const tomorrow = {
            id: "tomorrow",
            status: "pending" as const,
            createdAt: at("2026-10-20", "10:00"),
            scheduledFor: at("2026-10-25", "09:00"),
        };
        const done = { id: "done", ...rideNow("completed", "2026-10-24", "08:00") };
        const unclaimed = { id: "unclaimed", ...rideNow("pending", "2026-10-23", "18:00") };
        const lastWeek = {
            id: "lastWeek",
            status: "cancelled" as const,
            createdAt: at("2026-10-10", "10:00"),
            scheduledFor: at("2026-10-17", "09:00"),
        };

        const { current, past } = splitMyRides(
            [waiting, riding, tomorrow, done, unclaimed, lastWeek],
            now
        );
        expect(current.map((r) => r.id)).toEqual(["riding", "waiting", "tomorrow"]);
        expect(past.map((r) => r.id)).toEqual(["done", "unclaimed", "lastWeek"]);
    });

    it("counts a ride just booked, before the server stamps its time, as current", () => {
        const { current } = splitMyRides([{ id: "new", status: "pending", createdAt: null }], now);
        expect(current.map((r) => r.id)).toEqual(["new"]);
    });
});

describe("averageRating", () => {
    it("rounds to one decimal place", () => {
        expect(averageRating({ ratingSum: 29, ratingCount: 6 })).toBe(4.8);
    });

    it("is null before the rider's first rating", () => {
        expect(averageRating({})).toBeNull();
        expect(averageRating({ ratingSum: 0, ratingCount: 0 })).toBeNull();
    });
});

describe("splitRequests", () => {
    const scheduled = (id: string, hhmm: string) => ({
        id,
        scheduledFor: { toDate: () => istInstant("2026-10-24", hhmm) },
    });

    it("puts scheduled rides that are due with the rides now, ahead of them", () => {
        // now is 22:10; due from 30 min before.
        const { live, later } = splitRequests<{
            id: string;
            scheduledFor?: { toDate: () => Date };
        }>(
            [{ id: "now1" }],
            [scheduled("due", "22:30"), scheduled("tonight", "23:30")],
            now,
            DEFAULT_RIDE_SCHEDULE
        );
        expect(live.map((r) => r.id)).toEqual(["due", "now1"]);
        expect(later.map((r) => r.id)).toEqual(["tonight"]);
    });
});

describe("pickup pin", () => {
    it("links the pin to Google Maps", () => {
        expect(pickupMapsUrl({ lat: 9.5916, lng: 76.5222 })).toBe(
            "https://maps.google.com/?q=9.5916,76.5222"
        );
    });

    it("rounds the accuracy to whole metres", () => {
        expect(pickupAccuracyLabel(24.6)).toBe("±25 m");
    });

    it("gives a rough fix in kilometres", () => {
        expect(pickupAccuracyLabel(1840)).toBe("±1.8 km");
    });
});

describe("waitlisted campuses", () => {
    it("takes a waitlist for PTU and PIMS only", () => {
        expect(isWaitlistedCampus("PTU")).toBe(true);
        expect(isWaitlistedCampus("PIMS")).toBe(true);
        expect(isWaitlistedCampus("PU")).toBe(false);
        expect(isWaitlistedCampus(null)).toBe(false);
    });
});

describe("maskPhone", () => {
    it("keeps the first and last two digits", () => {
        expect(maskPhone("9876543210")).toBe("98******10");
    });
});

describe("secondsToConfirm", () => {
    const acceptedAt = { toDate: () => istInstant("2026-10-24", "22:10") };

    it("counts down the minute after a rider accepts", () => {
        expect(secondsToConfirm({ acceptedAt }, istInstant("2026-10-24", "22:10"))).toBe(60);
        expect(
            secondsToConfirm(
                { acceptedAt },
                new Date(istInstant("2026-10-24", "22:10").getTime() + 30_000)
            )
        ).toBe(30);
    });

    it("stops once confirmed or once the window passes", () => {
        expect(
            secondsToConfirm(
                { acceptedAt, userConfirmedAt: acceptedAt },
                istInstant("2026-10-24", "22:10:10")
            )
        ).toBeNull();
        expect(secondsToConfirm({ acceptedAt }, istInstant("2026-10-24", "22:11"))).toBeNull();
        expect(secondsToConfirm({}, istInstant("2026-10-24", "22:11"))).toBeNull();
    });
});
