import { z } from "zod";

export const CampusConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    deliveryCharge: z.number(),
});

/** A wash type admins price per kg; steam ironing is offered only where it's enabled. */
export const LaundryCategorySchema = z.object({
    id: z.string(),
    name: z.string(),
    pricePerKg: z.string(),
    steamIronEnabled: z.boolean(),
});

export const LaundryPricingSchema = z.object({
    steamIronPrice: z.string(),
    categories: z.array(LaundryCategorySchema).default([]),
});

export const LaundryCampusSettingsSchema = z.object({
    campuses: z.array(CampusConfigSchema),
});

export const LaundrySlotsSchema = z.object({
    slots: z.array(z.string()),
});
