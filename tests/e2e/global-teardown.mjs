import { shutdownFirebaseAdmin } from "./utils/firebase-helper.mjs";

export default async function globalTeardown() {
    await shutdownFirebaseAdmin();
    console.log("✅ Global teardown complete — Firebase Admin shut down.");
}
