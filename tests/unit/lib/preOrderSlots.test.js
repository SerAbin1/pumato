"use strict";

import { describe, it, expect } from "vitest";
import {
    resolvePreOrderSlotOccurrence,
    getAvailablePreOrderSlots,
    isPreOrderSlotSelectionValid,
    buildDeliverySlotFromOccurrence,
    formatDeliverySlot,
} from "../../../lib/preOrderSlots";

describe("resolvePreOrderSlotOccurrence", () => {
    it("resolves to today when now is strictly before the cutoff instant", () => {
        // 10:00 AM, slot 8:00-9:00 PM, 60min cutoff -> cutoff instant is 7:00 PM
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        const slot = { start: "20:00", end: "21:00", cutoffMinutes: 60 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-08-28");
        expect(occ.minutesUntilStart).toBe(600); // 1200 - 600
        expect(occ.isBookable).toBe(true);
    });

    it("resolves to today when now exactly equals the cutoff instant (inclusive boundary)", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 1140 }; // 7:00 PM
        const slot = { start: "20:00", end: "21:00", cutoffMinutes: 60 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-08-28");
        expect(occ.minutesUntilStart).toBe(60);
        expect(occ.isBookable).toBe(true);
    });

    it("rolls to tomorrow when now is exactly 1 minute past the cutoff instant", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 1141 }; // 7:01 PM
        const slot = { start: "20:00", end: "21:00", cutoffMinutes: 60 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-08-29");
        // Right after cutoff passes but before the slot's own start time, tomorrow's
        // occurrence is briefly >24h away and therefore not yet bookable — documents
        // that the slot temporarily disappears from the picker until `now` catches up.
        expect(occ.isBookable).toBe(false);
    });

    it("rolls to tomorrow once the slot's own start time has already passed today (0 cutoff)", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 }; // 10:00 AM
        const slot = { start: "08:00", end: "09:00", cutoffMinutes: 0 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-08-29");
        expect(occ.minutesUntilStart).toBe(1320); // 1440 - 600 + 480
        expect(occ.isBookable).toBe(true);
    });

    it("defaults cutoffMinutes to 0 when omitted", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        const slot = { start: "08:00", end: "09:00" }; // no cutoffMinutes field
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.cutoffMinutes).toBe(0);
        expect(occ.date).toBe("2026-08-29");
    });

    it("rolls the calendar date correctly across a month boundary", () => {
        const now = { year: 2026, month: 0, day: 31, timeInMinutes: 1400 }; // Jan 31, 11:20 PM
        const slot = { start: "23:00", end: "23:30", cutoffMinutes: 0 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-02-01");
    });

    it("rolls the calendar date correctly across a year boundary", () => {
        const now = { year: 2026, month: 11, day: 31, timeInMinutes: 1400 }; // Dec 31, 11:20 PM
        const slot = { start: "23:00", end: "23:30", cutoffMinutes: 0 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2027-01-01");
    });
});

describe("getAvailablePreOrderSlots", () => {
    it("includes a next-day occurrence when it's within the rolling 24h window", () => {
        // 10:00 PM now; 8-9 AM slot's cutoff already passed today, tomorrow's occurrence
        // is ~10h away (well within 24h) — the exact case negotiated with the user.
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 1320 };
        const slots = [{ start: "08:00", end: "09:00", cutoffMinutes: 30 }];
        const result = getAvailablePreOrderSlots(slots, now);
        expect(result).toHaveLength(1);
        expect(result[0].date).toBe("2026-08-29");
        expect(result[0].minutesUntilStart).toBe(600);
    });

    it("excludes a next-day occurrence once it's more than 24h away", () => {
        // 10:00 AM now; an 11-12 slot with a 90min cutoff already missed its cutoff
        // (9:30 AM) but hasn't started yet, so tomorrow's occurrence is 25h out.
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        const slots = [{ start: "11:00", end: "12:00", cutoffMinutes: 90 }];
        const result = getAvailablePreOrderSlots(slots, now);
        expect(result).toHaveLength(0);
    });

    it("returns entries sorted by soonest occurrence first", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 }; // 10:00 AM
        const slots = [
            { start: "18:00", end: "19:00", cutoffMinutes: 0 }, // 480 min away
            { start: "12:00", end: "13:00", cutoffMinutes: 0 }, // 120 min away
            { start: "15:00", end: "16:00", cutoffMinutes: 0 }, // 300 min away
        ];
        const result = getAvailablePreOrderSlots(slots, now);
        expect(result.map((r) => r.start)).toEqual(["12:00", "15:00", "18:00"]);
    });

    it("filters a mixed list down to only the currently bookable entries", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 }; // 10:00 AM
        const slots = [
            { start: "12:00", end: "13:00", cutoffMinutes: 0 }, // bookable today
            { start: "11:00", end: "12:00", cutoffMinutes: 90 }, // excluded (see above)
        ];
        const result = getAvailablePreOrderSlots(slots, now);
        expect(result).toHaveLength(1);
        expect(result[0].start).toBe("12:00");
    });

    it("returns [] for undefined, null, or non-array input", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        expect(getAvailablePreOrderSlots(undefined, now)).toEqual([]);
        expect(getAvailablePreOrderSlots(null, now)).toEqual([]);
        expect(getAvailablePreOrderSlots([], now)).toEqual([]);
        expect(getAvailablePreOrderSlots("not-an-array", now)).toEqual([]);
    });
});

describe("isPreOrderSlotSelectionValid", () => {
    const slots = [{ start: "20:00", end: "21:00", cutoffMinutes: 60 }];

    it("returns true when the selection still appears at a slightly later now", () => {
        const renderNow = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        const selected = resolvePreOrderSlotOccurrence(slots[0], renderNow);
        const submitNow = { year: 2026, month: 7, day: 28, timeInMinutes: 610 };
        expect(isPreOrderSlotSelectionValid(selected, slots, submitNow)).toBe(true);
    });

    it("returns false once the cutoff passes between render-time and submit-time now", () => {
        const renderNow = { year: 2026, month: 7, day: 28, timeInMinutes: 1130 }; // before 19:00 cutoff
        const selected = resolvePreOrderSlotOccurrence(slots[0], renderNow);
        const submitNow = { year: 2026, month: 7, day: 28, timeInMinutes: 1150 }; // after cutoff
        expect(isPreOrderSlotSelectionValid(selected, slots, submitNow)).toBe(false);
    });

    it("returns false for a selection matching no configured slot definition", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        const bogusSelection = { date: "2026-08-28", start: "05:00", end: "06:00" };
        expect(isPreOrderSlotSelectionValid(bogusSelection, slots, now)).toBe(false);
    });

    it("returns false for a null/undefined selection", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        expect(isPreOrderSlotSelectionValid(null, slots, now)).toBe(false);
        expect(isPreOrderSlotSelectionValid(undefined, slots, now)).toBe(false);
    });
});

describe("buildDeliverySlotFromOccurrence", () => {
    it("builds a campus delivery-slot record from a resolved occurrence + campusId", () => {
        const occurrence = {
            date: "2026-08-29",
            start: "08:00",
            end: "09:00",
            cutoffMinutes: 30,
            minutesUntilStart: 600,
            isBookable: true,
        };
        expect(buildDeliverySlotFromOccurrence(occurrence, "PU")).toEqual({
            source: "campus",
            date: "2026-08-29",
            start: "08:00",
            end: "09:00",
            cutoffMinutes: 30,
            campusId: "PU",
        });
    });
});

describe("formatDeliverySlot", () => {
    it("formats a campus slot object into a dated display string", () => {
        const slot = { source: "campus", date: "2026-08-29", start: "08:00", end: "09:00" };
        expect(formatDeliverySlot(slot)).toBe("Aug 29, 8:00 AM - 9:00 AM");
    });

    it("returns a restaurant slot object's label unchanged", () => {
        const slot = { source: "restaurant", label: "7:00 PM - 8:00 PM" };
        expect(formatDeliverySlot(slot)).toBe("7:00 PM - 8:00 PM");
    });

    it("returns a legacy plain string unchanged", () => {
        expect(formatDeliverySlot("7:00 PM - 8:00 PM")).toBe("7:00 PM - 8:00 PM");
    });

    it("returns '' for null/undefined", () => {
        expect(formatDeliverySlot(null)).toBe("");
        expect(formatDeliverySlot(undefined)).toBe("");
    });
});
