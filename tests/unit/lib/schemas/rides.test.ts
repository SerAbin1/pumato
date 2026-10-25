import { describe, it, expect } from "vite-plus/test";
import {
    RideRatingSchema,
    RideRequestSchema,
    RiderSchema,
    RideScheduleSchema,
} from "@/lib/schemas/rides";
import { DEFAULT_RIDE_SCHEDULE } from "@/lib/rides";

describe("RideScheduleSchema", () => {
    it("accepts the defaults", () => {
        expect(RideScheduleSchema.safeParse(DEFAULT_RIDE_SCHEDULE).success).toBe(true);
    });

    it("refuses a confirm window that runs into the ride", () => {
        const schedule = { ...DEFAULT_RIDE_SCHEDULE, reminderMinutes: 15, confirmMinutes: 15 };
        expect(RideScheduleSchema.safeParse(schedule).success).toBe(false);
    });
});

const request = {
    name: "Asha",
    phone: "9876543210",
    pickupId: "gate",
    pickupName: "Gate 1",
    dropId: "lib",
    dropName: "Library",
    fare: 20,
    status: "pending",
    createdAt: new Date(),
};

describe("RideRequestSchema", () => {
    it("defaults the rider preference to any", () => {
        expect(RideRequestSchema.parse(request).riderPreference).toBe("any");
    });

    it("accepts a female preference", () => {
        const parsed = RideRequestSchema.parse({ ...request, riderPreference: "female" });
        expect(parsed.riderPreference).toBe("female");
    });

    it("accepts a scheduled ride booked by a signed-in user", () => {
        const scheduled = { ...request, userId: "u1", scheduledFor: new Date() };
        expect(RideRequestSchema.safeParse(scheduled).success).toBe(true);
    });

    it("refuses a scheduled ride without a user", () => {
        expect(RideRequestSchema.safeParse({ ...request, scheduledFor: new Date() }).success).toBe(
            false
        );
    });

    it("accepts a ride now with the guest's exact pickup pin", () => {
        const pinned = { ...request, pickupLocation: { lat: 9.5916, lng: 76.5222, accuracy: 25 } };
        expect(RideRequestSchema.safeParse(pinned).success).toBe(true);
    });

    it("refuses a pin that isn't a real coordinate", () => {
        for (const pickupLocation of [
            { lat: 91, lng: 76.5, accuracy: 25 },
            { lat: 9.5, lng: -181, accuracy: 25 },
            { lat: 9.5, lng: 76.5, accuracy: 0 },
            { lat: 9.5, lng: 76.5, accuracy: 25, label: "home" },
        ]) {
            expect(RideRequestSchema.safeParse({ ...request, pickupLocation }).success).toBe(false);
        }
    });

    it("refuses a pin on a scheduled ride", () => {
        const scheduled = {
            ...request,
            userId: "u1",
            scheduledFor: new Date(),
            pickupLocation: { lat: 9.5916, lng: 76.5222, accuracy: 25 },
        };
        expect(RideRequestSchema.safeParse(scheduled).success).toBe(false);
    });

    it("knows cancelled and expired rides", () => {
        for (const status of ["cancelled", "expired"]) {
            expect(RideRequestSchema.safeParse({ ...request, status }).success).toBe(true);
        }
    });
});

const application = {
    uid: "u1",
    email: "a@b.c",
    name: "Asha",
    phone: "9876543210",
    vehicleNumber: "KL01AB1234",
    collegeId: "R1",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe("RideRatingSchema", () => {
    it("takes whole stars from one to five", () => {
        expect(RideRatingSchema.safeParse(1).success).toBe(true);
        expect(RideRatingSchema.safeParse(5).success).toBe(true);
        expect(RideRatingSchema.safeParse(0).success).toBe(false);
        expect(RideRatingSchema.safeParse(6).success).toBe(false);
        expect(RideRatingSchema.safeParse(4.5).success).toBe(false);
    });
});

describe("RiderSchema", () => {
    it("records the rider's gender", () => {
        expect(RiderSchema.parse({ ...application, gender: "female" }).gender).toBe("female");
    });

    it("refuses an unknown gender", () => {
        expect(RiderSchema.safeParse({ ...application, gender: "x" }).success).toBe(false);
    });
});
