const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

/**
 * Cloud Function: checkoutCoupon
 * Called when user clicks "Place Order via WhatsApp" with a coupon applied.
 * Validates usage limit and atomically increments usedCount.
 */
exports.checkoutCoupon = onCall(async (request) => {
    const { couponCode } = request.data;

    if (!couponCode || typeof couponCode !== "string") {
        throw new HttpsError("invalid-argument", "Coupon code is required.");
    }

    const couponRef = db.collection("promocodes").doc(couponCode.toUpperCase());

    try {
        const result = await db.runTransaction(async (transaction) => {
            const couponDoc = await transaction.get(couponRef);

            if (!couponDoc.exists) {
                throw new HttpsError("not-found", "Invalid coupon code.");
            }

            const data = couponDoc.data();
            const usageLimit = data.usageLimit || 0;
            const usedCount = data.usedCount || 0;

            // All coupons must have a usage limit
            if (usageLimit < 1) {
                throw new HttpsError(
                    "failed-precondition",
                    "Coupon is not configured properly."
                );
            }

            if (usedCount >= usageLimit) {
                throw new HttpsError(
                    "resource-exhausted",
                    "Coupon usage limit reached."
                );
            }

            transaction.update(couponRef, {
                usedCount: FieldValue.increment(1),
            });

            return { success: true };
        });

        return result;
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Transaction failed:", error);
        throw new HttpsError("internal", "Failed to process coupon.");
    }
});
