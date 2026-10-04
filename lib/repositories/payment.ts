import type { z } from "zod";
import type { Payment } from "@/lib/types";
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
 * @returns the order id the payment is filed under
 */
export async function createPayment(data: z.input<typeof PaymentSchema>): Promise<string> {
    const validated = PaymentSchema.parse(data);
    await setDoc(doc(db, COLLECTIONS.PAYMENTS, validated.orderId), validated);
    return validated.orderId;
}

/** @returns the payment filed against an order, if any */
export async function fetchPayment(
    orderId: string | null | undefined
): Promise<(Payment & { id: string }) | null> {
    if (!orderId) return null;
    const snap = await getDoc(doc(db, COLLECTIONS.PAYMENTS, orderId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Payment & { id: string }) : null;
}
