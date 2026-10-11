import { z } from "zod";

export const ORDER_STATUSES = [
    "placed",
    "confirmed",
    "viewed",
    "ready_for_delivery",
    "out_of_stock",
    "oos_acknowledged",
    "picked_up",
    "delivered",
    "cancelled",
    // In-app ("direct") orders for Payment Partner restaurants; see functions/src/order-flow.
    "awaiting_restaurants",
    "awaiting_customer",
    "awaiting_payment",
    "payment_submitted",
    "paid",
] as const;

export const ORDER_FLOWS = ["whatsapp", "direct"] as const;

export const LEG_STATUSES = [
    "pending",
    "confirmed",
    "unavailable",
    "dropped",
    "paid",
    "ready",
] as const;

/** One restaurant's share of a direct order. */
export const OrderLegSchema = z.object({
    status: z.enum(LEG_STATUSES),
    outOfStockItems: z.array(z.string()).optional(),
});

export const PaymentCollectorSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("restaurant"), restaurantId: z.string() }),
    z.object({ type: z.literal("pumato") }),
]);

/** A direct order's payment claim, held on the order until verified. */
export const PaymentProofSchema = z.object({
    status: z.enum(["pending_verification", "verified", "rejected"]),
    transactionId: z.string(),
    screenshotPath: z.string(),
});

export const OrderItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.coerce.number(),
    unitPrice: z.coerce.number(),
    quantity: z.number(),
    restaurantId: z.string(),
    restaurantName: z.string(),
    isVeg: z.boolean().default(false),
    category: z.string(),
    image: z.string().optional(),
    // Delivery weight snapshot, so a direct order can be repriced without the menu.
    weight: z.number().optional(),
    variant: z
        .object({
            id: z.string(),
            name: z.string(),
            price: z.coerce.number(),
            weight: z.number().nullable().optional(),
        })
        .optional(),
    addons: z
        .array(
            z.object({
                id: z.string(),
                name: z.string(),
                price: z.coerce.number(),
            })
        )
        .optional(),
});

export const CampusDeliverySlotSchema = z.object({
    source: z.literal("campus"),
    date: z.string(), // "YYYY-MM-DD", resolved IST calendar date this occurrence falls on
    start: z.string(), // "HH:MM"
    end: z.string(), // "HH:MM"
    cutoffMinutes: z.number(), // snapshot of the cutoff that applied when this occurrence was booked
    processingStart: z.string().optional(), // "HH:MM", same date as `date`
    processingEnd: z.string().optional(),
    campusId: z.string(),
});

export const RestaurantDeliverySlotSchema = z.object({
    source: z.literal("restaurant"),
    label: z.string().optional(), // legacy orders placed before restaurant-level cutoffs existed
    date: z.string().optional(), // "YYYY-MM-DD", resolved IST calendar date this occurrence falls on
    start: z.string().optional(), // "HH:MM"
    end: z.string().optional(), // "HH:MM"
    cutoffMinutes: z.number().optional(), // snapshot of the cutoff that applied when this occurrence was booked
    processingStart: z.string().optional(), // "HH:MM", same date as `date`
    processingEnd: z.string().optional(),
});

export const DeliverySlotSchema = z.union([CampusDeliverySlotSchema, RestaurantDeliverySlotSchema]);

export const OrderSchema = z.object({
    // Absent on orders placed before the in-app flow existed: those are WhatsApp orders.
    flow: z.enum(ORDER_FLOWS).optional(),
    legs: z.record(z.string(), OrderLegSchema).optional(),
    paymentCollector: PaymentCollectorSchema.optional(),
    payment: PaymentProofSchema.optional(),
    userId: z.string().optional(),
    // Assigned by createOrder inside the counter transaction, never by the caller.
    orderNumber: z.string().optional(),
    status: z.enum(ORDER_STATUSES),
    items: z.array(OrderItemSchema),
    restaurantIds: z.array(z.string()),
    name: z.string(),
    phone: z.string(),
    campus: z.string(),
    address: z.string(),
    instructions: z.string().optional(),
    total: z.number(),
    deliveryCharge: z.number(),
    finalTotal: z.number(),
    discount: z.number(),
    couponCode: z.string().optional(),
    deliveryPartnerUid: z.string().optional(),
    deliveryPartnerEmail: z.string().optional(),
    deliverySlot: DeliverySlotSchema.optional(),
    outOfStockItems: z.array(z.string()).optional(),
    createdAt: z.any(),
    updatedAt: z.any().optional(),
    adminProcessedAt: z.any().optional(),
    partnerViewedAt: z.any().optional(),
    readyAt: z.any().optional(),
    pickedUpAt: z.any().optional(),
    deliveredAt: z.any().optional(),
    oosAcknowledgedAt: z.any().optional(),
});
