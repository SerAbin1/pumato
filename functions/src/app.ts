import { initializeApp } from "firebase-admin/app";

// Imported first by index.ts: the function modules call getFirestore() /
// getAuth() at load time, which needs the default app to exist already.
initializeApp();
