import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getFcmTokensByUids } from "./fcm-tokens";

const db = getFirestore();
const messaging = getMessaging();

/**
 * Pushes every online rider when a guest books a ride; the first to accept
 * on their dashboard gets it.
 */
export const notifyRidersOfRequest = onDocumentCreated(
    "ride_requests/{requestId}",
    async (event) => {
        const request = event.data?.data();
        if (!request) return;

        const riders = await db
            .collection("riders")
            .where("status", "==", "approved")
            .where("online", "==", true)
            .get();
        const tokens = await getFcmTokensByUids(riders.docs.map((doc) => doc.id));
        if (tokens.length === 0) return;

        // Data-only, so the service worker builds the notification with this
        // tag and opens targetUrl when tapped.
        const data = {
            title: "New ride request",
            body: `${request.pickupName} → ${request.dropName}${request.fare ? ` · ₹${request.fare}` : ""}`,
            targetUrl: "/rides/rider",
            tag: "ride-request",
        };

        await Promise.allSettled(
            tokens.map((token) =>
                messaging.send({
                    token,
                    data,
                    // A request nobody sees within a few minutes is stale.
                    webpush: { headers: { Urgency: "high", TTL: "300" } },
                })
            )
        );
    }
);
