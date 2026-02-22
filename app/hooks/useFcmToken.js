"use client";

import { useEffect, useState, useCallback } from "react";
import { getToken } from "firebase/messaging";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, getFirebaseMessaging, VAPID_KEY } from "@/lib/firebase";

/**
 * Requests notification permission, obtains an FCM token, and persists it to
 * Firestore under `fcm_tokens/{uid}` so the Edge Function can look it up.
 *
 * Only runs client-side (guarded by `getFirebaseMessaging`).
 *
 * @param {object|null} user - Firebase Auth user object (must have a `.uid`)
 * @returns {{ permission: NotificationPermission, token: string|null }}
 */
export function useFcmToken(user) {
    const [permission, setPermission] = useState("default");
    const [token, setToken] = useState(null);

    const requestAndSaveToken = useCallback(async () => {
        if (!user?.uid) return;

        // 1. Ensure the browser supports FCM
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        // 2. Ask for permission (no-op if already granted/denied)
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== "granted") return;

        // 3. Get the FCM token
        let fcmToken;
        try {
            fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        } catch (err) {
            console.warn("FCM getToken failed:", err);
            return;
        }

        if (!fcmToken) return;
        setToken(fcmToken);

        // 4. Only write to Firestore if the token has changed
        try {
            const tokenRef = doc(db, "fcm_tokens", user.uid);
            const existing = await getDoc(tokenRef);
            if (!existing.exists() || existing.data()?.token !== fcmToken) {
                await setDoc(tokenRef, {
                    token: fcmToken,
                    updatedAt: new Date().toISOString(),
                });
            }
        } catch (err) {
            console.warn("FCM token save failed:", err);
        }
    }, [user?.uid]);

    useEffect(() => {
        requestAndSaveToken();
    }, [requestAndSaveToken]);

    return { permission, token };
}
