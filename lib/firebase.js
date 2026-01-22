import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

export { db, auth };
