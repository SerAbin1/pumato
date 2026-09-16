"use strict";

import { describe, it, expect } from "vitest";
import {
    resolvePreOrderSlotOccurrence,
    getAvailablePreOrderSlots,
    getSharedPreOrderSlots,
    groupsShareAnyWindow,
    isPreOrderSlotSelectionValid,
    buildDeliverySlotFromOccurrence,
    formatDeliverySlot,
    formatProcessingWindow,
} from "../../../lib/preOrderSlots";

describe("resolvePreOrderSlotOccurrence", () => {
    it("shows the day's slot right after midnight once the day has started (= 12AM+)", () => {
        // 12:05 AM, slot 8:00-9:00 PM, 60min cutoff -> same day, still bookable.
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 5 }; // just past midnight
        const slot = { start: "20:00", end: "21:00", cutoffMinutes: 60 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-08-28");
        expect(occ.minutesUntilStart).toBe(1195); // 1200 - 5
        expect(occ.isBookable).toBe(true);
    });

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

    it("marks the slot unavailable once past the cutoff — does not roll to tomorrow", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 1141 }; // 7:01 PM
        const slot = { start: "20:00", end: "21:00", cutoffMinutes: 60 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-08-28");
        expect(occ.isBookable).toBe(false);
    });

    it("marks the slot unavailable once its start time has already passed today (0 cutoff)", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 }; // 10:00 AM
        const slot = { start: "08:00", end: "09:00", cutoffMinutes: 0 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-08-28");
        expect(occ.minutesUntilStart).toBe(-120); // 480 - 600
        expect(occ.isBookable).toBe(false);
    });

    it("defaults cutoffMinutes to 0 when omitted", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        const slot = { start: "08:00", end: "09:00" }; // no cutoffMinutes field
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.cutoffMinutes).toBe(0);
        expect(occ.date).toBe("2026-08-28");
        expect(occ.isBookable).toBe(false);
    });

    it("keeps the slot on its own day (Jan 31) rather than rolling to a future month", () => {
        const now = { year: 2026, month: 0, day: 31, timeInMinutes: 1400 }; // Jan 31, 11:20 PM
        const slot = { start: "23:00", end: "23:30", cutoffMinutes: 0 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-01-31");
        expect(occ.isBookable).toBe(false);
    });

    it("keeps the slot on its own day (Dec 31) rather than rolling to a new year", () => {
        const now = { year: 2026, month: 11, day: 31, timeInMinutes: 1400 }; // Dec 31, 11:20 PM
        const slot = { start: "23:00", end: "23:30", cutoffMinutes: 0 };
        const occ = resolvePreOrderSlotOccurrence(slot, now);
        expect(occ.date).toBe("2026-12-31");
        expect(occ.isBookable).toBe(false);
    });
});

describe("getAvailablePreOrderSlots", () => {
    it("surfaces the day's upcoming slots well before their cutoff (right after 12AM)", () => {
        // 12:05 AM; an 8-9 PM slot with a 60min cutoff is later today and bookable.
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 5 };
        const slots = [{ start: "20:00", end: "21:00", cutoffMinutes: 60 }];
        const result = getAvailablePreOrderSlots(slots, now);
        expect(result).toHaveLength(1);
        expect(result[0].date).toBe("2026-08-28");
    });

    it("does not surface tomorrow's occurrence when today's cutoff has passed (the 8PM confusion case)", () => {
        // 8:00 PM now; the 8-9 PM slot's 60min cutoff (7:00 PM) already passed.
        // Previously the picker offered tomorrow's 8-9 PM slot — the exact
        // confusion this fixes. Now the slot must not appear.
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 1200 };
        const slots = [{ start: "20:00", end: "21:00", cutoffMinutes: 60 }];
        const result = getAvailablePreOrderSlots(slots, now);
        expect(result).toHaveLength(0);
    });

    it("excludes a slot whose day has passed (cutoff missed) — no next-day rollover", () => {
        // 10:00 PM now; 8-9 AM slot's cutoff (7:30 AM) already passed today.
        // Previously tomorrow's occurrence (~10h away) appeared; now it must not.
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 1320 };
        const slots = [{ start: "08:00", end: "09:00", cutoffMinutes: 30 }];
        const result = getAvailablePreOrderSlots(slots, now);
        expect(result).toHaveLength(0);
    });

    it("excludes a slot that has already missed its cutoff earlier today", () => {
        // 10:00 AM now; an 11-12 slot with a 90min cutoff already missed (9:30 AM cutoff).
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
    // Always an array of groups: one group (e.g. [campusSlots]) for campus mode,
    // one group per restaurant for a multi-restaurant cart.
    const groups = [[{ start: "20:00", end: "21:00", cutoffMinutes: 60 }]];

    it("returns true when the selection still appears at a slightly later now", () => {
        const renderNow = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        const selected = resolvePreOrderSlotOccurrence(groups[0][0], renderNow);
        const submitNow = { year: 2026, month: 7, day: 28, timeInMinutes: 610 };
        expect(isPreOrderSlotSelectionValid(selected, groups, submitNow)).toBe(true);
    });

    it("returns false once the cutoff passes between render-time and submit-time now", () => {
        const renderNow = { year: 2026, month: 7, day: 28, timeInMinutes: 1130 }; // before 19:00 cutoff
        const selected = resolvePreOrderSlotOccurrence(groups[0][0], renderNow);
        const submitNow = { year: 2026, month: 7, day: 28, timeInMinutes: 1150 }; // after cutoff
        expect(isPreOrderSlotSelectionValid(selected, groups, submitNow)).toBe(false);
    });

    it("returns false for a selection matching no configured slot definition", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        const bogusSelection = { date: "2026-08-28", start: "05:00", end: "06:00" };
        expect(isPreOrderSlotSelectionValid(bogusSelection, groups, now)).toBe(false);
    });

    it("returns false for a null/undefined selection", () => {
        const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 };
        expect(isPreOrderSlotSelectionValid(null, groups, now)).toBe(false);
        expect(isPreOrderSlotSelectionValid(undefined, groups, now)).toBe(false);
    });

    it("returns false once one restaurant's cutoff passes between render-time and submit-time in a multi-restaurant cart", () => {
        const multiGroups = [
            [{ start: "20:00", end: "21:00", cutoffMinutes: 60 }],
            [{ start: "20:00", end: "21:00", cutoffMinutes: 60 }],
        ];
        const renderNow = { year: 2026, month: 7, day: 28, timeInMinutes: 1130 }; // before 19:00 cutoff
        const selected = resolvePreOrderSlotOccurrence(multiGroups[0][0], renderNow);
        const submitNow = { year: 2026, month: 7, day: 28, timeInMinutes: 1150 }; // after cutoff
        expect(isPreOrderSlotSelectionValid(selected, multiGroups, submitNow)).toBe(false);
    });
});

describe("buildDeliverySlotFromOccurrence", () => {
    it("builds a campus delivery-slot record from a resolved occurrence + campusId", () => {
        const occurrence = {
            date: "2026-08-29",
            start: "08:00",
            end: "09:00",
            cutoffMinutes: 30,
            processingStart: "07:00",
            processingEnd: "07:30",
            minutesUntilStart: 600,
            isBookable: true,
        };
        expect(buildDeliverySlotFromOccurrence(occurrence, "campus", "PU")).toEqual({
            source: "campus",
            date: "2026-08-29",
            start: "08:00",
            end: "09:00",
            cutoffMinutes: 30,
            processingStart: "07:00",
            processingEnd: "07:30",
            campusId: "PU",
        });
    });

    it("defaults processingStart/processingEnd to '' when the occurrence has none", () => {
        const occurrence = {
            date: "2026-08-29",
            start: "08:00",
            end: "09:00",
            cutoffMinutes: 30,
            minutesUntilStart: 600,
            isBookable: true,
        };
        expect(buildDeliverySlotFromOccurrence(occurrence, "campus", "PU")).toEqual({
            source: "campus",
            date: "2026-08-29",
            start: "08:00",
            end: "09:00",
            cutoffMinutes: 30,
            processingStart: "",
            processingEnd: "",
            campusId: "PU",
        });
    });

    it("builds a restaurant delivery-slot record with no campusId field at all", () => {
        const occurrence = {
            date: "2026-08-29",
            start: "08:00",
            end: "09:00",
            cutoffMinutes: 30,
            processingStart: "07:00",
            processingEnd: "07:30",
            minutesUntilStart: 600,
            isBookable: true,
        };
        expect(buildDeliverySlotFromOccurrence(occurrence, "restaurant")).toEqual({
            source: "restaurant",
            date: "2026-08-29",
            start: "08:00",
            end: "09:00",
            cutoffMinutes: 30,
            processingStart: "07:00",
            processingEnd: "07:30",
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

describe("getSharedPreOrderSlots", () => {
    const now = { year: 2026, month: 7, day: 28, timeInMinutes: 600 }; // 10:00 AM

    it("returns [] for empty or missing input", () => {
        expect(getSharedPreOrderSlots([], now)).toEqual([]);
        expect(getSharedPreOrderSlots(undefined, now)).toEqual([]);
    });

    it("passes through a single restaurant's own bookable slots unchanged", () => {
        const defsList = [[{ start: "12:00", end: "13:00", cutoffMinutes: 0 }]];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0].start).toBe("12:00");
        expect(result[0].end).toBe("13:00");
    });

    it("excludes a slot only one restaurant offers — never a union across restaurants", () => {
        // Restaurant A only has 9-10, restaurant B only has 14-15: no shared slot at all.
        const defsList = [
            [{ start: "09:00", end: "10:00", cutoffMinutes: 0 }],
            [{ start: "14:00", end: "15:00", cutoffMinutes: 0 }],
        ];
        expect(getSharedPreOrderSlots(defsList, now)).toEqual([]);
    });

    it("shows the overlap sub-window, not a miss, when one restaurant's slot is wider than another's", () => {
        // A: 10-13 (broad prep window). B: 11-12 (tight window fully inside A's). Shared = 11-12.
        const defsList = [
            [{ start: "10:00", end: "13:00", cutoffMinutes: 0 }],
            [{ start: "11:00", end: "12:00", cutoffMinutes: 0 }],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ start: "11:00", end: "12:00" });
    });

    it("shows the overlap sub-window for a partial (not fully nested) overlap", () => {
        // now is 10:00 AM, so slot starts must be >= 10:00 to still be bookable (0 cutoff).
        // A: 11-14. B: 13-16. Overlap = 13-14.
        const defsList = [
            [{ start: "11:00", end: "14:00", cutoffMinutes: 0 }],
            [{ start: "13:00", end: "16:00", cutoffMinutes: 0 }],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ start: "13:00", end: "14:00" });
    });

    it("cascades the overlap across three restaurants, narrowing at each step", () => {
        // A: 11-16. B: 12-15. C: 13-14. Only the triple overlap (13-14) survives.
        const defsList = [
            [{ start: "11:00", end: "16:00", cutoffMinutes: 0 }],
            [{ start: "12:00", end: "15:00", cutoffMinutes: 0 }],
            [{ start: "13:00", end: "14:00", cutoffMinutes: 0 }],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ start: "13:00", end: "14:00" });
    });

    it("finds the one combination that overlaps when each restaurant offers multiple slots", () => {
        // A offers 8-9 (isolated) and 12-15. B offers only 13-14, which overlaps just A's 12-15.
        const defsList = [
            [
                { start: "08:00", end: "09:00", cutoffMinutes: 0 },
                { start: "12:00", end: "15:00", cutoffMinutes: 0 },
            ],
            [{ start: "13:00", end: "14:00", cutoffMinutes: 0 }],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ start: "13:00", end: "14:00" });
    });

    it("returns multiple distinct overlap windows when restaurants share slots at two different times", () => {
        // A: 11-13 and 15-17. B: 12-16 (spans both of A's slots). Two overlaps: 12-13 and 15-16.
        const defsList = [
            [
                { start: "11:00", end: "13:00", cutoffMinutes: 0 },
                { start: "15:00", end: "17:00", cutoffMinutes: 0 },
            ],
            [{ start: "12:00", end: "16:00", cutoffMinutes: 0 }],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result.map((r) => `${r.start}-${r.end}`)).toEqual(["12:00-13:00", "15:00-16:00"]);
    });

    it("computes cutoffMinutes relative to the overlap window's own start, using the earliest deadline", () => {
        // A: 13-16, cutoff 120min -> deadline 11:00. B: 14-15, cutoff 30min -> deadline 13:30.
        // Shared window is 14-15 (starts at 840min); earliest deadline is A's 11:00 (660min) -> 180min cutoff.
        const defsList = [
            [{ start: "13:00", end: "16:00", cutoffMinutes: 120 }],
            [{ start: "14:00", end: "15:00", cutoffMinutes: 30 }],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ start: "14:00", end: "15:00", cutoffMinutes: 180 });
    });

    it("returns the slot both restaurants share, alongside their own extra slots", () => {
        const defsList = [
            [
                { start: "09:00", end: "10:00", cutoffMinutes: 0 },
                { start: "12:00", end: "13:00", cutoffMinutes: 0 },
            ],
            [
                { start: "12:00", end: "13:00", cutoffMinutes: 0 },
                { start: "14:00", end: "15:00", cutoffMinutes: 0 },
            ],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ start: "12:00", end: "13:00" });
    });

    it("uses the larger (more restrictive) cutoff when restaurants disagree on the same slot", () => {
        const defsList = [
            [{ start: "18:00", end: "19:00", cutoffMinutes: 30 }],
            [{ start: "18:00", end: "19:00", cutoffMinutes: 90 }],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0].cutoffMinutes).toBe(90);
    });

    it("excludes the shared slot once any one restaurant's own cutoff for it has passed", () => {
        // 10:00 AM now. A's 11-12 slot with 90min cutoff already missed its 9:30 AM cutoff;
        // B still offers 11-12 with a 0min cutoff (bookable until 11:00). Not shared: A can't fulfill it.
        const defsList = [
            [{ start: "11:00", end: "12:00", cutoffMinutes: 90 }],
            [{ start: "11:00", end: "12:00", cutoffMinutes: 0 }],
        ];
        expect(getSharedPreOrderSlots(defsList, now)).toEqual([]);
    });

    it("uses the overlap (latest start, earliest end) of differing processing windows", () => {
        const defsList = [
            [
                {
                    start: "18:00",
                    end: "19:00",
                    cutoffMinutes: 0,
                    processingStart: "17:00",
                    processingEnd: "17:45",
                },
            ],
            [
                {
                    start: "18:00",
                    end: "19:00",
                    cutoffMinutes: 0,
                    processingStart: "17:15",
                    processingEnd: "17:30",
                },
            ],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0].processingStart).toBe("17:15");
        expect(result[0].processingEnd).toBe("17:30");
    });

    it("drops the processing window entirely when the restaurants' windows don't overlap", () => {
        const defsList = [
            [
                {
                    start: "18:00",
                    end: "19:00",
                    cutoffMinutes: 0,
                    processingStart: "17:00",
                    processingEnd: "17:15",
                },
            ],
            [
                {
                    start: "18:00",
                    end: "19:00",
                    cutoffMinutes: 0,
                    processingStart: "17:30",
                    processingEnd: "17:45",
                },
            ],
        ];
        const result = getSharedPreOrderSlots(defsList, now);
        expect(result).toHaveLength(1);
        expect(result[0].processingStart).toBe("");
        expect(result[0].processingEnd).toBe("");
    });
});

describe("groupsShareAnyWindow", () => {
    it("returns true when two restaurants' configured windows overlap, regardless of cutoffs", () => {
        // The exact case from the bug report: A 3:45-4:45 (cutoff already missed by "now"),
        // B 3:58-4:44. Structurally they DO overlap (3:58-4:44) even though nothing is
        // bookable right now — this must not be reported as "no shared window at all".
        const defsList = [
            [{ start: "15:45", end: "16:45", cutoffMinutes: 3 }],
            [{ start: "15:58", end: "16:44", cutoffMinutes: 2 }],
        ];
        expect(groupsShareAnyWindow(defsList)).toBe(true);
    });

    it("returns false when restaurants' configured windows never overlap at all", () => {
        const defsList = [
            [{ start: "09:00", end: "10:00", cutoffMinutes: 0 }],
            [{ start: "14:00", end: "15:00", cutoffMinutes: 0 }],
        ];
        expect(groupsShareAnyWindow(defsList)).toBe(false);
    });

    it("returns true when at least one pair of multi-slot combinations overlaps", () => {
        const defsList = [
            [
                { start: "08:00", end: "09:00", cutoffMinutes: 0 },
                { start: "12:00", end: "15:00", cutoffMinutes: 0 },
            ],
            [{ start: "13:00", end: "14:00", cutoffMinutes: 0 }],
        ];
        expect(groupsShareAnyWindow(defsList)).toBe(true);
    });

    it("returns false for empty or missing input", () => {
        expect(groupsShareAnyWindow([])).toBe(false);
        expect(groupsShareAnyWindow(undefined)).toBe(false);
    });
});

describe("formatProcessingWindow", () => {
    it("formats a resolved occurrence's processing window into a dated display string", () => {
        const occurrence = {
            date: "2026-08-29",
            processingStart: "18:30",
            processingEnd: "19:00",
        };
        expect(formatProcessingWindow(occurrence)).toBe("Aug 29, 6:30 PM - 7:00 PM");
    });

    it("formats a built campus delivery-slot record the same way", () => {
        const slot = {
            source: "campus",
            date: "2026-08-29",
            start: "20:00",
            end: "21:00",
            cutoffMinutes: 30,
            processingStart: "18:30",
            processingEnd: "19:00",
            campusId: "PU",
        };
        expect(formatProcessingWindow(slot)).toBe("Aug 29, 6:30 PM - 7:00 PM");
    });

    it("returns '' when processingStart/processingEnd are missing", () => {
        expect(formatProcessingWindow({ date: "2026-08-29" })).toBe("");
    });

    it("returns '' when date is missing", () => {
        expect(formatProcessingWindow({ processingStart: "18:30", processingEnd: "19:00" })).toBe(
            ""
        );
    });

    it("returns '' for null/undefined", () => {
        expect(formatProcessingWindow(null)).toBe("");
        expect(formatProcessingWindow(undefined)).toBe("");
    });
});
