"use strict";

import { describe, it, expect } from "vitest";
import { formatISTDateKey, addDaysToISTDateKey, formatDateKeyShort } from "../../../lib/dateUtils";

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

describe("formatDateKeyShort", () => {
    it("formats a mid-month date", () => {
        expect(formatDateKeyShort("2026-08-29")).toBe("Aug 29");
    });

    it("formats the 1st of a month without a leading zero", () => {
        expect(formatDateKeyShort("2026-01-01")).toBe("Jan 1");
    });

    it("formats the last day of December", () => {
        expect(formatDateKeyShort("2026-12-31")).toBe("Dec 31");
    });

    it("formats a single-digit day in March", () => {
        expect(formatDateKeyShort("2026-03-05")).toBe("Mar 5");
    });

    it("returns '' for empty/null input", () => {
        expect(formatDateKeyShort("")).toBe("");
        expect(formatDateKeyShort(null)).toBe("");
    });
});
