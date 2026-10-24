import { describe, it, expect } from "vite-plus/test";
import { RideScheduleSchema } from "@/lib/schemas/rides";
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
