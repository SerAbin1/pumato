const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore } = require("firebase-admin/firestore");

const db = getFirestore();
const COLLECTION = "promocodes";

exports.checkoutCoupon = onCall(async (request) => {
    const { couponCode } = request.data;

    if (!couponCode) {
        throw new HttpsError("invalid-argument", "Coupon code is required.");
    }

    const code = couponCode.toUpperCase();

    const snapshot = await db.collection(COLLECTION).where("code", "==", code).limit(1).get();

    if (snapshot.empty) {
        throw new HttpsError("not-found", "Invalid coupon code.");
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    const usageLimit = data.usage_limit || 0;
    const usedCount = data.used_count || 0;

    if (usageLimit < 1) {
        throw new HttpsError("failed-precondition", "Coupon is not configured properly.");
    }

    if (usedCount >= usageLimit) {
        throw new HttpsError("resource-exhausted", "Coupon usage limit reached.");
    }

    await db.runTransaction(async (transaction) => {
        const freshDoc = await transaction.get(doc.ref);
        const freshData = freshDoc.data();
        const currentUsed = freshData.used_count || 0;

        if (currentUsed >= usageLimit) {
            throw new HttpsError("resource-exhausted", "Coupon usage limit reached.");
        }

        transaction.update(doc.ref, { used_count: currentUsed + 1 });
    });

    return { success: true };
});
