import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { IST_TIME_ZONE } from "./ist";
import { isInactiveRider } from "./rider-inactivity";

const db = getFirestore();

/**
 * Marks approved riders offline once they've been inactive (no heartbeat) for
 * more than 30 minutes. Runs every 30 minutes IST.
 */
export const markInactiveRidersOffline = onSchedule(
    { schedule: "every 30 minutes", timeZone: IST_TIME_ZONE },
    async () => {
        const now = new Date();
        const snap = await db.collection("riders").where("status", "==", "approved").get();

        await Promise.allSettled(
            snap.docs.map(async (doc) => {
                if (!isInactiveRider(doc.data(), now)) return;
                await db.runTransaction(async (tx) => {
                    const fresh = await tx.get(doc.ref);
                    if (!fresh.exists) return;
                    if (!isInactiveRider(fresh.data() ?? {}, now)) return;
                    tx.update(doc.ref, {
                        online: false,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                });
            })
        );
    }
);
