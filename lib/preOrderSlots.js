import { formatISTDateKey, formatDateKeyShort } from "@/lib/dateUtils";
import { format12h } from "@/lib/formatters";

const toMinutes = (hhmm) => {
    const [h, m] = (hhmm || "00:00").split(":").map(Number);
    return h * 60 + m;
};

const fromMinutes = (min) =>
    `${Math.floor(min / 60)
        .toString()
        .padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`;

// Treats "" as "no constraint" rather than as an actual boundary — a restaurant that doesn't
// define a processing window shouldn't narrow the shared one down to nothing.
const laterOf = (a, b) => (!a ? b : !b ? a : a > b ? a : b);
const earlierOf = (a, b) => (!a ? b : !b ? a : a < b ? a : b);

/**
 * Resolves a recurring slot definition's occurrence for the current IST day
 * relative to an explicit "now". A slot only ever resolves to the current
 * calendar day — once its cutoff has passed it becomes unavailable for the
 * rest of the day instead of rolling over to tomorrow.
 *
 * Pure function — takes `now` explicitly instead of reading the clock, so
 * it can be unit tested with plain literals (mirrors lib/serviceStatus.js).
 *
 * @param {{start: string, end: string, cutoffMinutes?: number, processingStart?: string, processingEnd?: string}} slotDef
 * @param {{year: number, month: number, day: number, timeInMinutes: number}} now
 * @returns {{date: string, start: string, end: string, cutoffMinutes: number, processingStart: string, processingEnd: string, minutesUntilStart: number, isBookable: boolean}}
 */
export function resolvePreOrderSlotOccurrence(slotDef, now) {
    const cutoffMinutes = Number(slotDef?.cutoffMinutes) || 0;
    const startMin = toMinutes(slotDef?.start);
    const cutoffInstant = startMin - cutoffMinutes;

    // Bookable through and including the cutoff instant; strictly after it,
    // the slot is unavailable for the rest of the day (no next-day rollover).
    const cutoffPassed = now.timeInMinutes > cutoffInstant;
    const minutesUntilStart = startMin - now.timeInMinutes;

    return {
        date: formatISTDateKey({ year: now.year, month: now.month, day: now.day }),
        start: slotDef?.start,
        end: slotDef?.end,
        cutoffMinutes,
        // Processing window shares the resolved occurrence's date — passthrough, no separate resolution needed.
        processingStart: slotDef?.processingStart || "",
        processingEnd: slotDef?.processingEnd || "",
        minutesUntilStart,
        isBookable: !cutoffPassed && minutesUntilStart >= 0,
    };
}

/**
 * Resolves every slot definition to its occurrence on the current day and
 * returns only the ones still bookable, soonest first.
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
 * Narrows a running list of shared candidate windows by intersecting each one against every
 * occurrence in the next group — keeping only the overlapping sub-interval (max of starts, min
 * of ends) wherever they overlap at all. One group's occurrence can narrow multiple candidates,
 * and one candidate can be narrowed by multiple occurrences (a restaurant offering several slots),
 * so this is a full cross-product per step, same as any interval-intersection reduction.
 */
function intersectWithGroup(candidates, occurrences) {
    const next = [];
    for (const cand of candidates) {
        for (const occ of occurrences) {
            const startMin = Math.max(cand.startMin, toMinutes(occ.start));
            const endMin = Math.min(cand.endMin, toMinutes(occ.end));
            if (startMin >= endMin) continue; // no overlap

            const occCutoffInstant = toMinutes(occ.start) - occ.cutoffMinutes;
            const processingStart = laterOf(cand.processingStart, occ.processingStart);
            const processingEnd = earlierOf(cand.processingEnd, occ.processingEnd);
            const hasValidWindow =
                processingStart && processingEnd && processingStart < processingEnd;

            next.push({
                date: cand.date,
                startMin,
                endMin,
                // The earliest deadline across every contributing slot — booking must beat all of them.
                cutoffInstantMin: Math.min(cand.cutoffInstantMin, occCutoffInstant),
                processingStart: hasValidWindow ? processingStart : "",
                processingEnd: hasValidWindow ? processingEnd : "",
            });
        }
    }
    return next;
}

/**
 * Resolves each group's own bookable slots and returns only the time windows covered — and
 * currently bookable — by every group, so a single selected slot is guaranteed fulfillable by
 * all of them. A "group" is one campus or one restaurant's slot definitions; pass a single-element
 * list for campus mode (there's only ever one source) or one element per pre-order restaurant in
 * the cart. When groups define slots of different sizes, the overlapping sub-window is returned
 * (e.g. group A's 10-13 and group B's 11-12 share 11-12) — never a union, so a slot only one
 * group configured never appears, even if the cart also contains items from a group with no slot
 * there at all.
 *
 * @param {Array<Array<{start: string, end: string, cutoffMinutes?: number, processingStart?: string, processingEnd?: string}>>} perGroupSlotDefs
 * @param {{year: number, month: number, day: number, timeInMinutes: number}} now
 * @returns {Array<ReturnType<typeof resolvePreOrderSlotOccurrence>>}
 */
export function getSharedPreOrderSlots(perGroupSlotDefs, now) {
    if (!Array.isArray(perGroupSlotDefs) || perGroupSlotDefs.length === 0) return [];

    const perGroupOccurrences = perGroupSlotDefs.map((defs) =>
        getAvailablePreOrderSlots(defs, now)
    );
    if (perGroupOccurrences.some((occs) => occs.length === 0)) return []; // some group has nothing bookable at all

    const [firstGroup, ...restGroups] = perGroupOccurrences;
    let candidates = firstGroup.map((occ) => ({
        date: occ.date,
        startMin: toMinutes(occ.start),
        endMin: toMinutes(occ.end),
        cutoffInstantMin: toMinutes(occ.start) - occ.cutoffMinutes,
        processingStart: occ.processingStart,
        processingEnd: occ.processingEnd,
    }));

    for (const group of restGroups) {
        candidates = intersectWithGroup(candidates, group);
        if (candidates.length === 0) return [];
    }

    // Multiple contributing combinations can land on the same window (e.g. two overlapping slots
    // in one group both intersecting the same slot in another) — dedupe, keeping the earliest deadline.
    const byWindow = new Map();
    for (const c of candidates) {
        const key = `${c.startMin}_${c.endMin}`;
        const existing = byWindow.get(key);
        if (!existing || c.cutoffInstantMin < existing.cutoffInstantMin) byWindow.set(key, c);
    }

    return [...byWindow.values()]
        .map((c) => ({
            date: c.date,
            start: fromMinutes(c.startMin),
            end: fromMinutes(c.endMin),
            cutoffMinutes: c.startMin - c.cutoffInstantMin,
            processingStart: c.processingStart,
            processingEnd: c.processingEnd,
            minutesUntilStart: c.startMin - now.timeInMinutes,
            isBookable: true,
        }))
        .sort((a, b) => a.minutesUntilStart - b.minutesUntilStart);
}

/**
 * Structural-only check: do these groups' configured windows overlap at all, ignoring cutoffs
 * and bookability entirely? Used to tell apart two very different reasons getSharedPreOrderSlots
 * can come back empty — restaurants whose windows never overlap at all vs. restaurants that do
 * overlap but happen to have nothing bookable at this exact moment (e.g. one's cutoff just passed).
 * Those need different messaging: the first is a real configuration mismatch, the second is
 * transient and resolves itself (or is the same "check back later" case as a single restaurant).
 *
 * @param {Array<Array<{start: string, end: string}>>} perGroupSlotDefs
 * @returns {boolean}
 */
export function groupsShareAnyWindow(perGroupSlotDefs) {
    if (!Array.isArray(perGroupSlotDefs) || perGroupSlotDefs.length === 0) return false;

    const [firstGroup, ...restGroups] = perGroupSlotDefs;
    let candidates = (firstGroup || []).map((def) => ({
        startMin: toMinutes(def.start),
        endMin: toMinutes(def.end),
    }));

    for (const group of restGroups) {
        const next = [];
        for (const cand of candidates) {
            for (const def of group || []) {
                const startMin = Math.max(cand.startMin, toMinutes(def.start));
                const endMin = Math.min(cand.endMin, toMinutes(def.end));
                if (startMin < endMin) next.push({ startMin, endMin });
            }
        }
        candidates = next;
        if (candidates.length === 0) return false;
    }

    return candidates.length > 0;
}

/**
 * Re-validates a previously selected occurrence against a fresh `now` — used at checkout submit
 * time to catch a cart that sat open past cutoff (or, in a multi-restaurant cart, past the point
 * where the slot stopped being shared by all of them).
 *
 * @param {{date: string, start: string, end: string}} selectedSlot
 * @param {Array<Array<{start: string, end: string, cutoffMinutes?: number}>>} perGroupSlotDefs
 * @param {{year: number, month: number, day: number, timeInMinutes: number}} now
 * @returns {boolean}
 */
export function isPreOrderSlotSelectionValid(selectedSlot, perGroupSlotDefs, now) {
    if (!selectedSlot) return false;
    return getSharedPreOrderSlots(perGroupSlotDefs, now).some(
        (occ) =>
            occ.date === selectedSlot.date &&
            occ.start === selectedSlot.start &&
            occ.end === selectedSlot.end
    );
}

/**
 * Builds the OrderSchema-shaped delivery-slot record from a resolved occurrence. `campusId` only
 * applies (and is only included) when `source` is "campus" — a restaurant-sourced slot isn't tied
 * to one restaurant, since a checkout can span multiple pre-order restaurants at once.
 *
 * @param {{date: string, start: string, end: string, cutoffMinutes: number, processingStart?: string, processingEnd?: string}} occurrence
 * @param {"campus"|"restaurant"} source
 * @param {string} [campusId]
 * @returns {{source: "campus"|"restaurant", date: string, start: string, end: string, cutoffMinutes: number, processingStart: string, processingEnd: string, campusId?: string}}
 */
export function buildDeliverySlotFromOccurrence(occurrence, source, campusId) {
    return {
        source,
        date: occurrence.date,
        start: occurrence.start,
        end: occurrence.end,
        cutoffMinutes: occurrence.cutoffMinutes,
        processingStart: occurrence.processingStart || "",
        processingEnd: occurrence.processingEnd || "",
        ...(source === "campus" ? { campusId } : {}),
    };
}

/**
 * Formats an order's `deliverySlot` for display, handling every shape that
 * can appear in Firestore: the new campus/restaurant union, and legacy
 * plain-string orders written before this field became structured.
 *
 * @param {string|{source: "campus"|"restaurant", date: string, start: string, end: string}|{source: "restaurant", label: string}|null|undefined} deliverySlot
 * @returns {string}
 */
export function formatDeliverySlot(deliverySlot) {
    if (!deliverySlot) return "";
    if (typeof deliverySlot === "string") return deliverySlot; // legacy pre-migration orders
    if (deliverySlot.date && deliverySlot.start && deliverySlot.end) {
        return `${formatDateKeyShort(deliverySlot.date)}, ${format12h(deliverySlot.start)} - ${format12h(deliverySlot.end)}`;
    }
    if (deliverySlot.source === "restaurant") return deliverySlot.label || ""; // legacy pre-cutoff orders
    return "";
}

/**
 * Formats the processing window (when admin reviews/confirms the order) for display —
 * accepts either a resolved occurrence or a built campus delivery-slot record, both of
 * which carry `date`/`processingStart`/`processingEnd`.
 *
 * @param {{date?: string, processingStart?: string, processingEnd?: string}|null|undefined} occurrenceOrSlot
 * @returns {string}
 */
export function formatProcessingWindow(occurrenceOrSlot) {
    if (
        !occurrenceOrSlot?.date ||
        !occurrenceOrSlot?.processingStart ||
        !occurrenceOrSlot?.processingEnd
    ) {
        return "";
    }
    return `${formatDateKeyShort(occurrenceOrSlot.date)}, ${format12h(occurrenceOrSlot.processingStart)} - ${format12h(occurrenceOrSlot.processingEnd)}`;
}

/**
 * Whether pre-order is available at all for food delivery — campus-wide, or via at least one
 * restaurant — independent of any particular cart. Used to tell a visitor who isn't actively
 * checking out (e.g. on the homepage or in the nav bar) that they can still place a pre-order
 * even while immediate ordering is closed.
 *
 * @param {{isPreOrderEnabled?: boolean}|null|undefined} campusPreOrderConfig
 * @param {Array<{isPreOrderEnabled?: boolean, preOrderSlots?: Array}>|null|undefined} restaurants
 * @returns {boolean}
 */
export function hasAnyFoodPreOrderAvailable(campusPreOrderConfig, restaurants) {
    if (campusPreOrderConfig?.isPreOrderEnabled) return true;
    return (restaurants || []).some((r) => r?.isPreOrderEnabled && r?.preOrderSlots?.length > 0);
}
