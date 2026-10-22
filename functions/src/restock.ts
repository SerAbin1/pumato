import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { IST_TIME_ZONE } from "./ist";
import { restoreExpiredStock } from "./order-flow";
import type { FlowMenuItem } from "./order-flow";

const db = getFirestore();

/**
 * Puts items marked out of stock for the day back on the menu just after
 * midnight IST. Items a restaurant hid by hand are left alone.
 */
export const restockMenus = onSchedule(
    { schedule: "every day 00:05", timeZone: IST_TIME_ZONE },
    async () => {
        const now = new Date();
        const snapshot = await db.collection("restaurants").get();
        await Promise.all(
            snapshot.docs.map((doc) =>
                // Re-read inside a transaction so a menu edit made meanwhile isn't lost.
                db.runTransaction(async (tx) => {
                    const fresh = await tx.get(doc.ref);
                    const menu = (fresh.data()?.menu || []) as (FlowMenuItem & {
                        outOfStockUntil?: string | null;
                    })[];
                    const { menu: restocked, restoredIds } = restoreExpiredStock(menu, now);
                    if (restoredIds.length > 0) tx.update(doc.ref, { menu: restocked });
                })
            )
        );
    }
);
