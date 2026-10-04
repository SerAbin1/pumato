import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";

/** The parts of an order document the ranking reads. */
export interface TrendingOrder {
    status?: string;
    items?: ({ id?: string; restaurantId?: string; quantity?: number | string } | null)[];
}

export interface TrendingEntry {
    restaurantId: string;
    itemId: string;
    orders: number;
}

const LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
// IST has no DST, so a fixed offset is exact.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * The most recent complete Monday–Saturday week in IST: Monday 00:00 up to
 * (not including) Sunday 00:00. A refresh mid-week still ranks last week, so
 * the scheduled run and an admin refresh always agree on what "this week's
 * trending" means.
 *
 */
export function lastWeekWindow(now = new Date()): { start: Date; end: Date } {
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const sundayMidnightIst = Date.UTC(
        ist.getUTCFullYear(),
        ist.getUTCMonth(),
        ist.getUTCDate() - ist.getUTCDay()
    );
    const end = new Date(sundayMidnightIst - IST_OFFSET_MS);
    return { start: new Date(end.getTime() - 6 * DAY_MS), end };
}

/**
 * Most-ordered menu items across non-cancelled orders, from featured
 * restaurants only — trending is promotion, and it shouldn't send customers to
 * restaurants that don't pay commission. Orders aren't reliably marked
 * delivered yet, so anything placed and not cancelled counts.
 *
 * Ranked by how many distinct orders contained the item, not by quantity, so
 * one hostel's bulk order of 40 chapatis can't top the list on its own.
 * Quantity only breaks ties. Only ids and the order count are returned; the
 * client reads name, price and stock from the live restaurant document.
 *
 * @param orders - Order documents with `status` and `items`
 * @param options.featuredIds - Restaurant ids allowed to trend
 * @returns best first
 */
export function computeTrending(
    orders: (TrendingOrder | null | undefined)[] = [],
    { featuredIds, limit = LIMIT }: { featuredIds: Set<string | undefined>; limit?: number }
): TrendingEntry[] {
    const tally = new Map<string, TrendingEntry & { quantity: number }>();

    for (const order of orders) {
        if (!order || order.status === "cancelled") continue;
        const seenInOrder = new Set<string>();

        for (const item of order.items || []) {
            if (!item?.id || !featuredIds.has(item.restaurantId)) continue;
            const key = `${item.restaurantId}:${item.id}`;
            const entry = tally.get(key) || {
                restaurantId: item.restaurantId as string,
                itemId: item.id,
                orders: 0,
                quantity: 0,
            };
            if (!seenInOrder.has(key)) {
                entry.orders += 1;
                seenInOrder.add(key);
            }
            entry.quantity += Number(item.quantity) || 1;
            tally.set(key, entry);
        }
    }

    return [...tally.values()]
        .sort((a, b) => b.orders - a.orders || b.quantity - a.quantity)
        .slice(0, limit)
        .map(({ restaurantId, itemId, orders }) => ({ restaurantId, itemId, orders }));
}

/** Ranks last week's orders and overwrites `site_content/trending`. */
async function recomputeTrending(now = new Date()): Promise<{ count: number }> {
    const db = getFirestore();
    const { start, end } = lastWeekWindow(now);

    const [featuredSnap, ordersSnap] = await Promise.all([
        db.collection("restaurants").where("isFeatured", "==", true).get(),
        db
            .collection("orders")
            .where("createdAt", ">=", Timestamp.fromDate(start))
            .where("createdAt", "<", Timestamp.fromDate(end))
            .get(),
    ]);

    const featuredIds = new Set<string | undefined>(featuredSnap.docs.map((d) => d.id));
    const items = computeTrending(
        ordersSnap.docs.map((d) => d.data() as TrendingOrder),
        { featuredIds }
    );

    await db
        .collection("site_content")
        .doc("trending")
        .set({
            items,
            weekStart: Timestamp.fromDate(start),
            weekEnd: Timestamp.fromDate(end),
            updatedAt: FieldValue.serverTimestamp(),
        });

    return { count: items.length };
}

// Sunday morning rather than midnight, so Saturday's late orders have been
// delivered by the time they're counted.
export const scheduledTrending = onSchedule(
    { schedule: "every sunday 06:00", timeZone: "Asia/Kolkata" },
    async () => {
        await recomputeTrending();
    }
);

/** Admin "Refresh trending" button — same computation, on demand. */
export const refreshTrending = onCall(async (request) => {
    if (request.auth?.token?.admin !== true) {
        throw new HttpsError("permission-denied", "Admin access required.");
    }
    return recomputeTrending();
});
