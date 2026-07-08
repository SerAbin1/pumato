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
    quantity: z.number(),
    restaurantId: z.string(),
    restaurantName: z.string(),
    isVeg: z.boolean().default(false),
    category: z.string(),
    image: z.string().optional(),
});

export const OrderSchema = z.object({
    userId: z.string().optional(),
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
    deliverySlot: z.string().optional(),
    outOfStockItems: z.array(z.string()).optional(),
    createdAt: z.any(),
    adminProcessedAt: z.any().optional(),
    partnerViewedAt: z.any().optional(),
    readyAt: z.any().optional(),
    pickedUpAt: z.any().optional(),
    deliveredAt: z.any().optional(),
    oosAcknowledgedAt: z.any().optional(),
});
