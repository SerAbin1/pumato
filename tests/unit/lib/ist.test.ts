"use strict";

import { describe, it, expect } from "vite-plus/test";
import {
    istNow,
    toMinutes,
    fromMinutes,
    isWithinWindow,
    formatISTDateKey,
    addDaysToISTDateKey,
    istInstant,
} from "../../../lib/ist";

describe("istNow", () => {
    it("reads the IST wall clock for a given instant", () => {
        expect(istNow(new Date("2026-10-22T08:30:00Z"))).toEqual({
            year: 2026,
            month: 9,
            day: 22,
            hours: 14,
            minutes: 0,
            timeInMinutes: 840,
        });
    });

    it("rolls over to the next IST day before UTC does", () => {
        expect(istNow(new Date("2026-12-31T18:30:00Z"))).toMatchObject({
            year: 2027,
            month: 0,
            day: 1,
        });
    });

    it("reports midnight as hour 0, never 24", () => {
        expect(istNow(new Date("2026-10-22T18:35:00Z"))).toMatchObject({
            day: 23,
            hours: 0,
            minutes: 5,
            timeInMinutes: 5,
        });
    });

    it("reads the current time when no instant is given", () => {
        const now = istNow();
        expect(now.timeInMinutes).toBe(now.hours * 60 + now.minutes);
    });
});

describe("toMinutes", () => {
    it("converts HH:MM to minutes since midnight", () => {
        expect(toMinutes("00:00")).toBe(0);
        expect(toMinutes("09:30")).toBe(570);
        expect(toMinutes("23:59")).toBe(1439);
    });

    it("treats a missing time as 00:00 by default", () => {
        expect(toMinutes(undefined)).toBe(0);
        expect(toMinutes("")).toBe(0);
    });

    it("uses the given fallback for a missing time", () => {
        expect(toMinutes(undefined, "23:59")).toBe(1439);
        expect(toMinutes("", "23:59")).toBe(1439);
    });
});

describe("fromMinutes", () => {
    it("converts minutes since midnight to zero-padded HH:MM", () => {
        expect(fromMinutes(0)).toBe("00:00");
        expect(fromMinutes(570)).toBe("09:30");
        expect(fromMinutes(1439)).toBe("23:59");
    });

    it("round-trips with toMinutes", () => {
        expect(fromMinutes(toMinutes("18:05"))).toBe("18:05");
    });
});

describe("isWithinWindow", () => {
    it("includes both edges of a same-day window", () => {
        expect(isWithinWindow(540, "09:00", "17:00")).toBe(true);
        expect(isWithinWindow(1020, "09:00", "17:00")).toBe(true);
        expect(isWithinWindow(539, "09:00", "17:00")).toBe(false);
        expect(isWithinWindow(1021, "09:00", "17:00")).toBe(false);
    });

    it("handles a window that crosses midnight", () => {
        expect(isWithinWindow(1320, "22:00", "02:00")).toBe(true); // 22:00
        expect(isWithinWindow(0, "22:00", "02:00")).toBe(true);
        expect(isWithinWindow(120, "22:00", "02:00")).toBe(true); // 02:00
        expect(isWithinWindow(121, "22:00", "02:00")).toBe(false);
        expect(isWithinWindow(1319, "22:00", "02:00")).toBe(false);
    });

    it("treats a missing start as 00:00 and a missing end as 23:59", () => {
        expect(isWithinWindow(0, undefined, "10:00")).toBe(true);
        expect(isWithinWindow(1439, "10:00", undefined)).toBe(true);
        expect(isWithinWindow(599, "10:00", undefined)).toBe(false);
    });

    it("treats an equal start and end as a single minute", () => {
        expect(isWithinWindow(600, "10:00", "10:00")).toBe(true);
        expect(isWithinWindow(601, "10:00", "10:00")).toBe(false);
    });
});

describe("formatISTDateKey", () => {
    it("formats a mid-year date with double-digit month/day", () => {
        expect(formatISTDateKey({ year: 2026, month: 7, day: 28 })).toBe("2026-08-28");
    });

    it("pads a single-digit month and day (January 1st)", () => {
        expect(formatISTDateKey({ year: 2026, month: 0, day: 1 })).toBe("2026-01-01");
    });

    it("pads a single-digit day with a double-digit month", () => {
        expect(formatISTDateKey({ year: 2026, month: 11, day: 5 })).toBe("2026-12-05");
    });

    it("handles a different year correctly", () => {
        expect(formatISTDateKey({ year: 2000, month: 2, day: 9 })).toBe("2000-03-09");
    });

    it("handles the last day of a month", () => {
        expect(formatISTDateKey({ year: 2026, month: 0, day: 31 })).toBe("2026-01-31");
    });
});

describe("addDaysToISTDateKey", () => {
    it("adds a day within the same month", () => {
        expect(addDaysToISTDateKey({ year: 2026, month: 7, day: 28 }, 1)).toEqual({
            year: 2026,
            month: 7,
            day: 29,
        });
    });

    it("rolls over to the next month", () => {
        expect(addDaysToISTDateKey({ year: 2026, month: 0, day: 31 }, 1)).toEqual({
            year: 2026,
            month: 1,
            day: 1,
        });
    });

    it("rolls over to the next year", () => {
        expect(addDaysToISTDateKey({ year: 2026, month: 11, day: 31 }, 1)).toEqual({
            year: 2027,
            month: 0,
            day: 1,
        });
    });

    it("returns the same date for a zero offset", () => {
        expect(addDaysToISTDateKey({ year: 2026, month: 7, day: 15 }, 0)).toEqual({
            year: 2026,
            month: 7,
            day: 15,
        });
    });

    it("supports a negative offset, rolling back a month", () => {
        expect(addDaysToISTDateKey({ year: 2026, month: 7, day: 1 }, -1)).toEqual({
            year: 2026,
            month: 6,
            day: 31,
        });
    });
});

describe("istInstant", () => {
    it("reads a date key and HH:MM as IST wall-clock time", () => {
        expect(istInstant("2026-10-25", "16:30").toISOString()).toBe("2026-10-25T11:00:00.000Z");
    });

    it("lands early-morning IST on the previous UTC day", () => {
        expect(istInstant("2026-10-25", "02:00").toISOString()).toBe("2026-10-24T20:30:00.000Z");
    });

    it("round-trips through istNow", () => {
        expect(istNow(istInstant("2026-12-31", "23:45"))).toMatchObject({
            year: 2026,
            month: 11,
            day: 31,
            timeInMinutes: 23 * 60 + 45,
        });
    });
});
