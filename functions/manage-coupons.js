const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();
const COLLECTION = "promocodes";

async function verifyAdmin(token) {
    try {
        const decoded = await getAuth().verifyIdToken(token);
        return decoded.admin === true;
    } catch {
        return false;
    }
}

exports.manageCoupons = onCall(async (request) => {
    const { action, payload } = request.data;

    if (action === "FETCH_VISIBLE") {
        const snapshot = await db
            .collection(COLLECTION)
            .where("is_visible", "==", true)
            .where("is_active", "==", true)
            .get();

        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "FETCH_BY_CODE") {
        const code = String(payload?.code || "")
            .trim()
            .toUpperCase();
        if (!code) {
            throw new HttpsError("invalid-argument", "Coupon code is required.");
        }

        const snapshot = await db.collection(COLLECTION).where("code", "==", code).limit(1).get();

        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    const authHeader = request.rawRequest.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw new HttpsError("unauthenticated", "Missing authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const isAdmin = await verifyAdmin(token);
    if (!isAdmin) {
        throw new HttpsError("permission-denied", "Admin access required.");
    }

    if (action === "FETCH_ALL") {
        const snapshot = await db.collection(COLLECTION).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    if (action === "CREATE" || action === "UPDATE") {
        const docId = payload.id || payload.code.toUpperCase();
        const docData = {
            code: payload.code.toUpperCase(),
            type: payload.type,
            value: payload.value,
            min_order: payload.minOrder,
            description: payload.description,
            is_visible: payload.isVisible,
            is_active: payload.isActive,
            usage_limit: payload.usageLimit,
            used_count: payload.usedCount || 0,
            restaurant_id: payload.restaurantId || null,
            item_id: payload.itemId || null,
        };

        await db.collection(COLLECTION).doc(docId).set(docData, { merge: true });
        return { id: docId, ...docData };
    }

    if (action === "DELETE") {
        if (!payload?.id) {
            throw new HttpsError("invalid-argument", "Missing coupon id.");
        }
        await db.collection(COLLECTION).doc(payload.id).delete();
        return { success: true };
    }

    throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
});
