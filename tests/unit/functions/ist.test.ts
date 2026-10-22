import { describe, it, expect } from "vite-plus/test";
import { startOfIstDay, nextIstMidnight, istWeekday } from "../../../functions/src/ist";

describe("startOfIstDay", () => {
    it("returns the IST midnight that began the current IST day", () => {
        expect(startOfIstDay(new Date("2026-10-22T08:30:00Z")).toISOString()).toBe(
            "2026-10-21T18:30:00.000Z"
        );
    });

    it("returns the same instant at exactly IST midnight", () => {
        expect(startOfIstDay(new Date("2026-10-21T18:30:00Z")).toISOString()).toBe(
            "2026-10-21T18:30:00.000Z"
        );
    });

    it("belongs to the previous IST day one millisecond before midnight", () => {
        expect(startOfIstDay(new Date("2026-10-21T18:29:59.999Z")).toISOString()).toBe(
            "2026-10-20T18:30:00.000Z"
        );
    });
});

describe("nextIstMidnight", () => {
    it("returns the upcoming IST midnight", () => {
        expect(nextIstMidnight(new Date("2026-10-22T08:30:00Z")).toISOString()).toBe(
            "2026-10-22T18:30:00.000Z"
        );
    });

    it("moves to the following midnight when already at IST midnight", () => {
        expect(nextIstMidnight(new Date("2026-10-21T18:30:00Z")).toISOString()).toBe(
            "2026-10-22T18:30:00.000Z"
        );
    });
});

describe("istWeekday", () => {
    it("returns the IST day of the week, Sunday = 0", () => {
        expect(istWeekday(new Date("2026-10-22T08:30:00Z"))).toBe(4); // Thu
    });

    it("uses the IST date when it is already tomorrow in IST", () => {
        expect(istWeekday(new Date("2026-10-22T19:00:00Z"))).toBe(5); // Fri 00:30 IST
    });
});
