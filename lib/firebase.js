import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyB4Hz3AEB582FRhuQjf0xo1NFT1J_ZMfDg",
    authDomain: "pumato-84497.firebaseapp.com",
    projectId: "pumato-84497",
    storageBucket: "pumato-84497.firebasestorage.app",
    messagingSenderId: "263938985818",
    appId: "1:263938985818:web:9bc64bc77e3a0347f66d63",
    measurementId: "G-L4THS646SE"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// FCM — lazily initialised, only in the browser.
// Resolves to `null` if the browser doesn't support service workers (e.g. Safari < 16).
let _messaging = null;
export async function getFirebaseMessaging() {
    if (typeof window === "undefined") return null;
    if (_messaging) return _messaging;
    const supported = await isSupported();
    if (!supported) return null;
    _messaging = getMessaging(app);
    return _messaging;
}

// VAPID public key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates.
// Replace this placeholder after generating the key in the Firebase Console.
export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

export { db, auth };
