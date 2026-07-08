import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const auth = getAuth();
const db = getFirestore();
const messaging = getMessaging();

async function verifyCaller(token: string): Promise<any> {
    try {
        return await auth.verifyIdToken(token);
    } catch {
        return null;
    }
}

async function getFcmTokensByUids(uids: string[]): Promise<string[]> {
    const tokens: string[] = [];

    const docs = await Promise.all(uids.map((uid) => db.collection("fcm_tokens").doc(uid).get()));

    for (const doc of docs) {
        if (doc.exists) {
            const token = doc.data()?.token;
            if (token) tokens.push(token);
        }
    }

    return tokens;
}

async function getFcmTokensByRestaurantIds(restaurantIds: string[]): Promise<string[]> {
    const tokens: string[] = [];

    const snapshots = await Promise.all(
        restaurantIds.map((restaurantId) =>
            db.collection("fcm_tokens").where("restaurantId", "==", restaurantId).get()
        )
    );

    for (const snapshot of snapshots) {
        for (const doc of snapshot.docs) {
            const token = doc.data().token;
            if (token) tokens.push(token);
        }
    }

    return tokens;
}

export const sendFcmNotification = onCall(async (request) => {
    // Verify caller is authenticated admin or partner
    const authHeader = request.rawRequest.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw new HttpsError("unauthenticated", "Missing authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const callerPayload = await verifyCaller(token);
    if (!callerPayload) {
        throw new HttpsError("permission-denied", "Invalid token.");
    }

    const { role, orderId, targetUids, restaurantIds } = request.data;

    // Admin notifications disabled
    if (role === "admin" || !role) {
        return { sent: 0, message: "Admin notifications disabled" };
    }

    // Resolve FCM tokens
    let fcmTokens: string[] = [];

    if (targetUids && Array.isArray(targetUids) && targetUids.length > 0) {
        fcmTokens = await getFcmTokensByUids(targetUids);
    } else if (
        role === "partner" &&
        restaurantIds &&
        Array.isArray(restaurantIds) &&
        restaurantIds.length > 0
    ) {
        fcmTokens = await getFcmTokensByRestaurantIds(restaurantIds);
    }

    if (fcmTokens.length === 0) {
        return { sent: 0, message: "No FCM tokens found" };
    }

    // Build notification payload
    const notificationPayload = {
        title: "New Order Received",
        body: orderId
            ? `Order #${orderId.slice(-6).toUpperCase()} has been placed.`
            : "A new order is waiting.",
        role: role || "admin",
        targetUrl: role === "partner" ? "/partner" : "/admin",
        orderId: orderId || "",
    };

    // Send to all tokens
    const messages = fcmTokens.map((token) =>
        messaging.send({
            token,
            data: notificationPayload,
            webpush: {
                headers: {
                    Urgency: "high",
                    TTL: "60",
                },
                notification: {
                    title: notificationPayload.title,
                    body: notificationPayload.body,
                    icon: "/android-chrome-192x192.png",
                    badge: "/favicon-32x32.png",
                    tag: "new-order",
                    renotify: true,
                    data: notificationPayload,
                },
            },
        })
    );

    await Promise.allSettled(messages);

    return { sent: fcmTokens.length };
});
