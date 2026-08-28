import { addDaysToISTDateKey, formatISTDateKey, formatDateKeyShort } from "@/lib/dateUtils";
import { format12h } from "@/lib/formatters";

const ONE_DAY_MINUTES = 1440;

const toMinutes = (hhmm) => {
    const [h, m] = (hhmm || "00:00").split(":").map(Number);
    return h * 60 + m;
};

/**
 * Resolves a single recurring slot definition's next bookable occurrence
 * relative to an explicit "now", and whether that occurrence falls within
 * the rolling 24-hour booking window.
 *
 * Pure function — takes `now` explicitly instead of reading the clock, so
 * it can be unit tested with plain literals (mirrors lib/serviceStatus.js).
 *
 * @param {{start: string, end: string, cutoffMinutes?: number}} slotDef
 * @param {{year: number, month: number, day: number, timeInMinutes: number}} now
 * @returns {{date: string, start: string, end: string, cutoffMinutes: number, minutesUntilStart: number, isBookable: boolean}}
 */
export function resolvePreOrderSlotOccurrence(slotDef, now) {
    const cutoffMinutes = Number(slotDef?.cutoffMinutes) || 0;
    const startMin = toMinutes(slotDef?.start);
    const cutoffInstantToday = startMin - cutoffMinutes;

    // Bookable through and including the cutoff instant; strictly after it, roll to tomorrow.
    const cutoffPassed = now.timeInMinutes > cutoffInstantToday;
    const dayOffset = cutoffPassed ? 1 : 0;

    const minutesUntilStart =
        dayOffset === 0
            ? startMin - now.timeInMinutes
            : ONE_DAY_MINUTES - now.timeInMinutes + startMin;

    const occurrenceDate = addDaysToISTDateKey(
        { year: now.year, month: now.month, day: now.day },
        dayOffset
    );

    return {
        date: formatISTDateKey(occurrenceDate),
        start: slotDef?.start,
        end: slotDef?.end,
        cutoffMinutes,
        minutesUntilStart,
        isBookable: minutesUntilStart >= 0 && minutesUntilStart <= ONE_DAY_MINUTES,
    };
}

/**
 * Resolves every slot definition to its next occurrence and returns only
 * the ones still bookable within the rolling 24h window, soonest first.
 * Does NOT check an `isPreOrderEnabled` flag itself — callers gate on that
 * before calling (or just pass `[]`).
 *
 * @param {Array<{start: string, end: string, cutoffMinutes?: number}>} slotDefs
 * @param {{year: number, month: number, day: number, timeInMinutes: number}} now
 * @returns {Array<ReturnType<typeof resolvePreOrderSlotOccurrence>>}
 */
export function getAvailablePreOrderSlots(slotDefs, now) {
    if (!Array.isArray(slotDefs)) return [];
    return slotDefs
        .map((slot) => resolvePreOrderSlotOccurrence(slot, now))
        .filter((occ) => occ.isBookable)
        .sort((a, b) => a.minutesUntilStart - b.minutesUntilStart);
}

/**
 * Re-validates a previously selected occurrence against a fresh `now` —
 * used at checkout submit time to catch a cart that sat open past cutoff.
 *
 * @param {{date: string, start: string, end: string}} selectedSlot
 * @param {Array<{start: string, end: string, cutoffMinutes?: number}>} slotDefs
 * @param {{year: number, month: number, day: number, timeInMinutes: number}} now
 * @returns {boolean}
 */
export function isPreOrderSlotSelectionValid(selectedSlot, slotDefs, now) {
    if (!selectedSlot) return false;
    return getAvailablePreOrderSlots(slotDefs, now).some(
        (occ) =>
            occ.date === selectedSlot.date &&
            occ.start === selectedSlot.start &&
            occ.end === selectedSlot.end
    );
}

/**
 * Builds the OrderSchema-shaped campus delivery-slot record from a resolved
 * occurrence + the campus it came from.
 *
 * @param {{date: string, start: string, end: string, cutoffMinutes: number}} occurrence
 * @param {string} campusId
 * @returns {{source: "campus", date: string, start: string, end: string, cutoffMinutes: number, campusId: string}}
 */
export function buildDeliverySlotFromOccurrence(occurrence, campusId) {
    return {
        source: "campus",
        date: occurrence.date,
        start: occurrence.start,
        end: occurrence.end,
        cutoffMinutes: occurrence.cutoffMinutes,
        campusId,
    };
}

/**
 * Formats an order's `deliverySlot` for display, handling every shape that
 * can appear in Firestore: the new campus/restaurant union, and legacy
 * plain-string orders written before this field became structured.
 *
 * @param {string|{source: "campus", date: string, start: string, end: string}|{source: "restaurant", label: string}|null|undefined} deliverySlot
 * @returns {string}
 */
export function formatDeliverySlot(deliverySlot) {
    if (!deliverySlot) return "";
    if (typeof deliverySlot === "string") return deliverySlot; // legacy pre-migration orders
    if (deliverySlot.source === "restaurant") return deliverySlot.label || "";
    if (deliverySlot.date && deliverySlot.start && deliverySlot.end) {
        return `${formatDateKeyShort(deliverySlot.date)}, ${format12h(deliverySlot.start)} - ${format12h(deliverySlot.end)}`;
    }
    return "";
}
