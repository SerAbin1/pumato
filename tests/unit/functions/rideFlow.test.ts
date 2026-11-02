import { describe, it, expect } from "vite-plus/test";
import {
    affectsAvailability,
    availabilityByCampus,
    completionChanged,
    fareIncrease,
    formatRideTime,
    inAudience,
    isStaleRideNow,
    maskPhone,
    newRating,
    planScheduledRide,
    planUserConfirmation,
    pushAudience,
    rideRequestBody,
    waitlistByCampus,
} from "../../../functions/src/ride-flow";
import type { SweepRide } from "../../../functions/src/ride-flow";

// Ride at 16:30 IST; with a 30-minute reminder the sweep acts from 16:00.
const SCHEDULE = { reminderMinutes: 30, confirmMinutes: 15 };
const at = (hhmm: string) => new Date(`2026-10-25T${hhmm}:00+05:30`);
const ride = (extra: Partial<SweepRide> = {}): SweepRide => ({
    status: "pending",
    scheduledFor: at("16:30"),
    ...extra,
});
const plan = (r: SweepRide, now: string) => planScheduledRide(r, at(now), SCHEDULE);

describe("planScheduledRide: nobody has accepted", () => {
    it("waits until the reminder time", () => {
        expect(plan(ride(), "15:59")).toBeNull();
    });

    it("pushes every online rider again at the reminder time", () => {
        expect(plan(ride(), "16:00")).toBe("broadcast");
    });

    it("pushes only once", () => {
        expect(plan(ride({ broadcastAt: at("16:00") }), "16:10")).toBeNull();
    });

    it("expires an hour after the ride's time", () => {
        expect(plan(ride({ broadcastAt: at("16:00") }), "17:29")).toBeNull();
        expect(plan(ride({ broadcastAt: at("16:00") }), "17:30")).toBe("expire");
    });
});

describe("planScheduledRide: a rider has accepted", () => {
    const accepted = (extra: Partial<SweepRide> = {}) =>
        ride({ status: "accepted", acceptedAt: at("09:00"), ...extra });

    it("waits until the reminder time", () => {
        expect(plan(accepted(), "15:59")).toBeNull();
    });

    it("asks the rider to confirm at the reminder time", () => {
        expect(plan(accepted(), "16:00")).toBe("remind");
    });

    it("counts a rider who accepted after the reminder time as confirmed", () => {
        expect(plan(accepted({ acceptedAt: at("16:05") }), "16:06")).toBe("autoConfirm");
    });

    it("gives the rider the confirm window", () => {
        expect(plan(accepted({ confirmRequestedAt: at("16:00") }), "16:14")).toBeNull();
    });

    it("releases the ride when the rider doesn't confirm in time", () => {
        expect(plan(accepted({ confirmRequestedAt: at("16:00") }), "16:15")).toBe("release");
    });

    it("leaves a confirmed ride alone", () => {
        const confirmed = accepted({
            confirmRequestedAt: at("16:00"),
            riderConfirmedAt: at("16:03"),
        });
        expect(plan(confirmed, "16:20")).toBeNull();
        expect(plan(confirmed, "18:00")).toBeNull();
    });
});

describe("pushAudience", () => {
    it("sends a new ride-now request to online riders on its campus", () => {
        expect(pushAudience("new", { riderPreference: "any", campusId: "PU" })).toEqual({
            campusId: "PU",
            onlineOnly: true,
            gender: "any",
        });
    });

    it("sends a new scheduled request to every approved rider on its campus, online or not", () => {
        expect(
            pushAudience("new", { riderPreference: "any", scheduled: true, campusId: "PU" })
        ).toEqual({ campusId: "PU", onlineOnly: false, gender: "any" });
    });

    it("keeps a female-preference request to female riders", () => {
        expect(pushAudience("rebroadcast", { riderPreference: "female", campusId: "PTU" })).toEqual(
            { campusId: "PTU", onlineOnly: true, gender: "female" }
        );
    });

    it("sends a widened request only to riders who didn't get it yet", () => {
        expect(pushAudience("widened", { riderPreference: "any", campusId: "PU" })).toEqual({
            campusId: "PU",
            onlineOnly: true,
            gender: "notFemale",
        });
        expect(
            pushAudience("widened", { riderPreference: "any", scheduled: true, campusId: "PU" })
        ).toEqual({ campusId: "PU", onlineOnly: false, gender: "notFemale" });
    });
});

describe("inAudience", () => {
    const female = { gender: "female" };
    const male = { gender: "male" };
    const unset = {};

    it("matches riders to each audience", () => {
        expect([female, male, unset].map((r) => inAudience(r, "any"))).toEqual([true, true, true]);
        expect([female, male, unset].map((r) => inAudience(r, "female"))).toEqual([
            true,
            false,
            false,
        ]);
        expect([female, male, unset].map((r) => inAudience(r, "notFemale"))).toEqual([
            false,
            true,
            true,
        ]);
    });
});

describe("rideRequestBody", () => {
    it("shows the route and fare", () => {
        expect(rideRequestBody({ pickupName: "Gate 1", dropName: "Library", fare: 20 })).toBe(
            "Gate 1 → Library · ₹20"
        );
    });

    it("adds the time of a scheduled ride", () => {
        expect(
            rideRequestBody({
                pickupName: "Gate 1",
                dropName: "Library",
                fare: null,
                scheduledFor: at("16:30"),
            })
        ).toBe("Gate 1 → Library · Sun 25 Oct, 4:30 PM");
    });

    it("marks a female-preference request", () => {
        expect(
            rideRequestBody({
                pickupName: "Gate 1",
                dropName: "Library",
                fare: null,
                riderPreference: "female",
            })
        ).toBe("Gate 1 → Library · Female pilot requested");
    });
});

describe("formatRideTime", () => {
    it("shows weekday, date and 12-hour IST time", () => {
        expect(formatRideTime(at("00:05"))).toBe("Sun 25 Oct, 12:05 AM");
    });
});

describe("affectsAvailability", () => {
    const rider = { status: "approved", gender: "female", online: true, campusId: "PU" };

    it("notices a female rider going offline", () => {
        expect(affectsAvailability(rider, { ...rider, online: false })).toBe(true);
    });

    it("notices approval, gender changes and deletion", () => {
        expect(affectsAvailability({ ...rider, status: "pending" }, rider)).toBe(true);
        expect(affectsAvailability({ ...rider, gender: undefined }, rider)).toBe(true);
        expect(affectsAvailability(rider, undefined)).toBe(true);
    });

    it("notices a female rider moving campus", () => {
        expect(affectsAvailability(rider, { ...rider, campusId: "PTU" })).toBe(true);
    });

    it("ignores changes that can't move the counts", () => {
        const renamed = { ...rider, name: "New name" };
        expect(affectsAvailability(rider, renamed)).toBe(false);
        const male = { status: "approved", gender: "male", online: true };
        expect(affectsAvailability(male, { ...male, online: false })).toBe(false);
    });
});

describe("availabilityByCampus", () => {
    it("flags each campus with an approved female rider, and whether one is online", () => {
        expect(
            availabilityByCampus([
                { campusId: "PU", online: false },
                { campusId: "PU", online: true },
                { campusId: "PTU", online: false },
            ])
        ).toEqual({
            PU: { femaleApproved: true, femaleOnline: true },
            PTU: { femaleApproved: true, femaleOnline: false },
        });
    });

    it("leaves out campuses with no female rider", () => {
        expect(availabilityByCampus([])).toEqual({});
    });
});

describe("newRating", () => {
    const completed = { status: "completed", riderUid: "rider1" };

    it("counts a ride's first rating towards its rider", () => {
        expect(newRating(completed, { ...completed, rating: 4 })).toEqual({
            riderUid: "rider1",
            rating: 4,
        });
    });

    it("ignores updates that don't add a rating", () => {
        expect(newRating(completed, completed)).toBeNull();
        // The function's own stamp, once it has counted the rating.
        expect(
            newRating({ ...completed, rating: 4 }, { ...completed, rating: 4, ratingCountedAt: 1 })
        ).toBeNull();
    });

    it("ignores a rating that isn't whole stars from one to five", () => {
        expect(newRating(completed, { ...completed, rating: 9 })).toBeNull();
        expect(newRating(completed, { ...completed, rating: 2.5 })).toBeNull();
    });

    it("ignores a rating on a ride with no rider", () => {
        expect(newRating({ status: "completed" }, { status: "completed", rating: 5 })).toBeNull();
    });
});

describe("isStaleRideNow", () => {
    const bookedAt = at("16:00");

    it("leaves a ride alone for its first 10 minutes", () => {
        expect(isStaleRideNow(bookedAt, at("16:09"))).toBe(false);
    });

    it("cancels a ride now nobody took after 10 minutes", () => {
        expect(isStaleRideNow(bookedAt, at("16:10"))).toBe(true);
    });

    it("never cancels a ride with no booking time", () => {
        expect(isStaleRideNow(undefined, at("17:00"))).toBe(false);
    });
});

describe("planUserConfirmation", () => {
    const accepted = (extra = {}) => ({
        status: "accepted",
        acceptedAt: at("16:00"),
        ...extra,
    });

    it("gives the user a minute to cancel or confirm", () => {
        expect(planUserConfirmation(accepted(), at("16:00"))).toBeNull();
        expect(
            planUserConfirmation(accepted(), new Date(at("16:00").getTime() + 59_000))
        ).toBeNull();
    });

    it("confirms by itself once the minute is up", () => {
        expect(planUserConfirmation(accepted(), at("16:01"))).toBe("confirm");
    });

    it("leaves a ride the user already confirmed", () => {
        expect(
            planUserConfirmation(accepted({ userConfirmedAt: at("16:00:20") }), at("16:02"))
        ).toBe(null);
    });

    it("ignores pending and scheduled-only rides", () => {
        expect(
            planUserConfirmation({ status: "pending", acceptedAt: at("16:00") }, at("16:02"))
        ).toBe(null);
        expect(planUserConfirmation({ status: "accepted" }, at("16:02"))).toBe(null);
    });
});

describe("fareIncrease", () => {
    it("reports how much the user added", () => {
        expect(fareIncrease({ fare: 20 }, { fare: 25 })).toBe(5);
        expect(fareIncrease({ fare: 20 }, { fare: 35 })).toBe(15);
    });

    it("ignores other updates and fare drops", () => {
        expect(fareIncrease({ fare: 20 }, { fare: 20 })).toBeNull();
        expect(fareIncrease({ fare: 20 }, { fare: 15 })).toBeNull();
        expect(fareIncrease({ fare: null }, { fare: 5 })).toBeNull();
        expect(fareIncrease({}, {})).toBeNull();
    });
});

describe("maskPhone", () => {
    it("keeps the first and last two digits and stars the rest", () => {
        expect(maskPhone("9876543210")).toBe("98******10");
    });

    it("stars a number too short to mask", () => {
        expect(maskPhone("1234")).toBe("****");
    });
});

describe("completionChanged", () => {
    it("notices a ride becoming completed, and one being un-completed", () => {
        expect(completionChanged({ status: "accepted" }, { status: "completed" })).toBe(true);
        expect(completionChanged({ status: "completed" }, { status: "accepted" })).toBe(true);
        expect(completionChanged({ status: "completed" }, undefined)).toBe(true);
    });

    it("ignores updates to rides that aren't completing", () => {
        expect(completionChanged({ status: "pending" }, { status: "accepted" })).toBe(false);
        expect(completionChanged(undefined, { status: "pending" })).toBe(false);
    });
});

describe("waitlistByCampus", () => {
    it("counts each campus's sign-ups", () => {
        expect(
            waitlistByCampus(
                ["PTU", "PIMS"],
                [{ campusId: "PTU" }, { campusId: "PIMS" }, { campusId: "PTU" }]
            )
        ).toEqual({ PTU: 2, PIMS: 1 });
    });

    it("reports zero for a campus nobody joined", () => {
        expect(waitlistByCampus(["PTU", "PIMS"], [])).toEqual({ PTU: 0, PIMS: 0 });
    });
});
