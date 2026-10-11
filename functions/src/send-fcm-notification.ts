import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import { getFcmTokensByRestaurantIds, getFcmTokensByUids } from "./fcm-tokens";

const auth = getAuth();
const messaging = getMessaging();

interface SendFcmRequest {
    role?: string;
    orderId?: string;
    targetUids?: string[];
    restaurantIds?: string[];
}

async function verifyCaller(token: string) {
    try {
        return await auth.verifyIdToken(token);
    } catch {
        return null;
    }
}

export const sendFcmNotification = onCall<SendFcmRequest>(async (request) => {
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

    if (role === "admin" || !role) {
        return { sent: 0, message: "Admin notifications disabled" };
    }

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

    const notificationPayload = {
        title: "New Order Received",
        body: orderId
            ? `Order #${orderId.slice(-6).toUpperCase()} has been placed.`
            : "A new order is waiting.",
        role: role || "admin",
        targetUrl: role === "partner" ? "/partner" : "/admin",
        orderId: orderId || "",
    };

    const messages = fcmTokens.map((token) =>
        messaging.send({
            token,
            data: notificationPayload,
            webpush: {
                headers: { Urgency: "high", TTL: "60" },
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
