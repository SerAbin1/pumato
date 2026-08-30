import { z } from "zod";

export const PAYMENT_STATUSES = ["pending_verification", "verified", "rejected"];

/**
 * A customer's claim that they paid, pending manual verification.
 * The document id is the order id, so an order can only ever carry one.
 */
export const PaymentSchema = z.object({
    orderId: z.string(),
    userId: z.string(),
    orderNumber: z.string().optional(),
    amount: z.number(),
    // What we put in the deep link's `tr`, so the payment can be matched by eye.
    reference: z.string().optional(),
    // What the customer read off their UPI app and pasted back.
    transactionId: z.string(),
    status: z.enum(PAYMENT_STATUSES),
    createdAt: z.any(),
    verifiedAt: z.any().optional(),
    verifiedBy: z.string().optional(),
});
