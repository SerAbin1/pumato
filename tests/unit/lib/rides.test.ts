import { describe, it, expect } from "vite-plus/test";
import {
    bookableDates,
    DEFAULT_RIDE_SCHEDULE,
    formatDateOption,
    formatRideTime,
    isDueSoon,
    isSchedulable,
    occupiesRider,
    pickupAccuracyLabel,
    pickupMapsUrl,
    scheduledTime,
    riderRef,
    routeFare,
    routeKey,
    scheduleProblem,
    scheduledRideStatus,
    telegramUrl,
    whatsappUrl,
} from "@/lib/rides";
import { istInstant } from "@/lib/ist";

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
        expect(scheduledRideStatus({ status: "pending" })).toBe("Waiting for a rider");
        expect(scheduledRideStatus({ status: "pending", broadcastAt: ts })).toBe(
            "Looking for a rider now"
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
        expect(scheduledRideStatus({ status: "expired" })).toBe("No rider found");
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
