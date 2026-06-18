"use strict";

import { describe, it, expect } from "vitest";
import { isServiceLive } from "../../../lib/serviceStatus";

describe("isServiceLive", () => {
    describe("when manual override is 'closed' (admin force close)", () => {
        it("returns false regardless of scheduled slots", () => {
            const slots = [
                { start: "09:00", end: "17:00" },
                { start: "18:00", end: "22:00" },
            ];
            expect(isServiceLive("closed", slots, 540)).toBe(false); // 09:00
            expect(isServiceLive("closed", slots, 1080)).toBe(false); // 18:00
            expect(isServiceLive("closed", slots, 1200)).toBe(false); // 20:00
            expect(isServiceLive("closed", slots, 0)).toBe(false); // 00:00
        });

        it("returns false even when slots are empty", () => {
            expect(isServiceLive("closed", [], 0)).toBe(false);
            expect(isServiceLive("closed", [], 1440)).toBe(false);
        });

        it("returns false even when slots are null/undefined", () => {
            expect(isServiceLive("closed", null, 0)).toBe(false);
            expect(isServiceLive("closed", undefined, 1440)).toBe(false);
        });

        it("returns false during operating hours (proves force close overrides)", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive("closed", slots, 540)).toBe(false); // 09:00
            expect(isServiceLive("closed", slots, 900)).toBe(false); // 15:00
            expect(isServiceLive("closed", slots, 1020)).toBe(false); // 17:00
        });

        it("returns false outside operating hours (proves force close overrides)", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive("closed", slots, 480)).toBe(false); // 08:00
            expect(isServiceLive("closed", slots, 1140)).toBe(false); // 19:00
        });
    });

    describe("when manual override is 'open' (admin force open)", () => {
        it("returns true regardless of scheduled slots", () => {
            const slots = [
                { start: "09:00", end: "17:00" },
                { start: "18:00", end: "22:00" },
            ];
            expect(isServiceLive("open", slots, 540)).toBe(true);
            expect(isServiceLive("open", slots, 1080)).toBe(true);
            expect(isServiceLive("open", slots, 1200)).toBe(true);
            expect(isServiceLive("open", slots, 0)).toBe(true);
        });

        it("returns true even when slots are empty", () => {
            expect(isServiceLive("open", [], 0)).toBe(true);
            expect(isServiceLive("open", [], 1440)).toBe(true);
        });

        it("returns true even when slots are null/undefined", () => {
            expect(isServiceLive("open", null, 0)).toBe(true);
            expect(isServiceLive("open", undefined, 1440)).toBe(true);
        });
    });

    describe("when manual override is 'auto' or null/undefined (normal operation)", () => {
        it("returns true when time is within scheduled slots", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, 540)).toBe(true); // 09:00
            expect(isServiceLive(null, slots, 900)).toBe(true); // 15:00
            expect(isServiceLive(undefined, slots, 1020)).toBe(true); // 17:00
        });

        it("returns false when time is outside scheduled slots", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, 480)).toBe(false); // 08:00
            expect(isServiceLive(null, slots, 1140)).toBe(false); // 19:00
        });

        it("returns false when slots are empty", () => {
            expect(isServiceLive(null, [], 0)).toBe(false);
            expect(isServiceLive(null, [], 1440)).toBe(false);
        });

        it("returns false when slots are null/undefined", () => {
            expect(isServiceLive(null, null, 0)).toBe(false);
            expect(isServiceLive(null, undefined, 1440)).toBe(false);
        });

        it("returns true when time exactly at slot start", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, 540)).toBe(true); // 09:00
        });

        it("returns true when time exactly at slot end", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, 1020)).toBe(true); // 17:00
        });

        it("returns false when time is just after slot end", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, 1026)).toBe(false); // 17:01
        });

        it("returns false when time is just before slot start", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, 534)).toBe(false); // 08:54
        });

        it("handles multiple slots correctly", () => {
            const slots = [
                { start: "09:00", end: "12:00" },
                { start: "14:00", end: "17:00" },
            ];
            expect(isServiceLive(null, slots, 540)).toBe(true); // 09:00
            expect(isServiceLive(null, slots, 660)).toBe(true); // 11:00
            expect(isServiceLive(null, slots, 840)).toBe(true); // 14:00
            expect(isServiceLive(null, slots, 1020)).toBe(true); // 17:00
            expect(isServiceLive(null, slots, 1026)).toBe(false); // 17:01
        });

        it("handles slot times that cross midnight", () => {
            const slots = [{ start: "22:00", end: "06:00" }];
            expect(isServiceLive(null, slots, 1320)).toBe(true); // 22:00
            expect(isServiceLive(null, slots, 1380)).toBe(true); // 23:00
            expect(isServiceLive(null, slots, 0)).toBe(true); // 00:00
            expect(isServiceLive(null, slots, 360)).toBe(true); // 06:00
            expect(isServiceLive(null, slots, 420)).toBe(false); // 07:00
        });

        it("handles missing start/end times in slots", () => {
            const slots = [
                { start: "09:00", end: "17:00" },
                { start: "18:00" }, // missing end
                { end: "23:59" }, // missing start
                {}, // both missing
            ];
            expect(isServiceLive(null, slots, 540)).toBe(true); // 09:00
            expect(isServiceLive(null, slots, 1080)).toBe(true); // 18:00
            expect(isServiceLive(null, slots, 1380)).toBe(true); // 23:59
            expect(isServiceLive(null, slots, 1020)).toBe(true); // 17:00
        });
    });

    describe("edge cases", () => {
        it("handles negative time values", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, -60)).toBe(false);
        });

        it("handles time values greater than 1440 (24 hours)", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, 1500)).toBe(false);
        });

        it("handles invalid time formats gracefully", () => {
            const slots = [{ start: "invalid", end: "also-invalid" }];
            expect(isServiceLive(null, slots, 0)).toBe(false);
        });

        it("handles slots with non-numeric time values", () => {
            const slots = [{ start: "09:00", end: "17:00" }];
            expect(isServiceLive(null, slots, "invalid")).toBe(false);
        });
    });
});
