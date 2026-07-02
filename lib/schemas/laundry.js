import { z } from "zod";

export const LAUNDRY_ORDER_STATUSES = [
    "ReadyForPickup",
    "PendingCustomerPayment",
    "DeliveryPending",
    "PendingShopPayment",
    "Completed",
    "PaidToShop",
    "Delivered",
    "CustomerPaid",
];

export const LaundryItemSchema = z.object({
    name: z.string(),
    quantity: z.number(),
    steamIron: z.boolean(),
});

export const LaundryOrderSchema = z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string(),
    campus: z.string(),
    location: z.string(),
    instructions: z.string().optional(),
    scheduledDate: z.string(),
    scheduledSlot: z.string(),
    items: z.array(LaundryItemSchema),
    status: z.enum(LAUNDRY_ORDER_STATUSES),
    customerPaidAmount: z.number().nullable().optional(),
    paidToShopAmount: z.number().nullable().optional(),
    weight: z.number().nullable().optional(),
    distance: z.string().optional(),
    createdAt: z.any(),
    updatedAt: z.any().optional(),
    pickedUpFromCustomerAt: z.any().optional(),
    customerPaidAt: z.any().optional(),
    deliveredToCustomerAt: z.any().optional(),
    paidToShopAt: z.any().optional(),
    rescheduledAt: z.any().optional(),
    rescheduledDate: z.string().optional(),
    rescheduledSlot: z.string().optional(),
});
