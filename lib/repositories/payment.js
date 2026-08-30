import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { PaymentSchema } from "@/lib/schemas/payment";
import { COLLECTIONS } from "@/lib/constants";

/**
 * Records a customer's payment claim.
 *
 * The document id is the order id, so a second submission for the same order
 * is rejected by the create-only security rule rather than relying on the UI
 * to prevent it.
 *
 * @param {Object} data - Matching PaymentSchema
 * @returns {Promise<string>} the order id the payment is filed under
 */
export async function createPayment(data) {
    const validated = PaymentSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.PAYMENTS, validated.orderId), validated);
    return validated.orderId;
}

/** @returns {Promise<Object|null>} the payment filed against an order, if any */
export async function fetchPayment(orderId) {
    if (!orderId) return null;
    const snap = await getDoc(doc(db, COLLECTIONS.PAYMENTS, orderId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
