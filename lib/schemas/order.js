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
];

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
    variant: z
        .object({
            id: z.string(),
            name: z.string(),
            price: z.coerce.number(),
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
    label: z.string(), // e.g. "7:00 PM - 8:00 PM"
});

export const DeliverySlotSchema = z.union([CampusDeliverySlotSchema, RestaurantDeliverySlotSchema]);

export const OrderSchema = z.object({
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
    adminProcessedAt: z.any().optional(),
    partnerViewedAt: z.any().optional(),
    readyAt: z.any().optional(),
    pickedUpAt: z.any().optional(),
    deliveredAt: z.any().optional(),
    oosAcknowledgedAt: z.any().optional(),
});
