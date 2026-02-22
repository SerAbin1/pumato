// firebase-messaging-sw.js
// This file MUST be served from the root path (/firebase-messaging-sw.js).
// It runs in the background even when the dashboard tab is closed.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyB4Hz3AEB582FRhuQjf0xo1NFT1J_ZMfDg",
    authDomain: "pumato-84497.firebaseapp.com",
    projectId: "pumato-84497",
    storageBucket: "pumato-84497.firebasestorage.app",
    messagingSenderId: "263938985818",
    appId: "1:263938985818:web:9bc64bc77e3a0347f66d63",
});

const messaging = firebase.messaging();

// Handle background push messages sent as FCM "data" messages.
// Data messages don't auto-display a notification — we build one manually
// so we can play the custom sound.
messaging.onBackgroundMessage((payload) => {
    const { title = "New Order Received", body = "A new order has been placed.", sound } = payload.data || {};

    const notificationOptions = {
        body,
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        tag: "new-order", // Replaces previous notification instead of stacking
        renotify: true,   // Still plays sound/vibration even if replacing
        vibrate: [200, 100, 200],
        data: payload.data,
    };

    self.registration.showNotification(title, notificationOptions);
});

// When the user taps the notification, focus or open the dashboard tab.
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.targetUrl || "/admin";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && "focus" in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
