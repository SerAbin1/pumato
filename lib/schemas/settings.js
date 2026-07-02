import { z } from "zod";

export const CampusConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    deliveryCharge: z.number(),
});

export const LaundryPricingSchema = z.object({
    pricePerKg: z.string(),
    steamIronPrice: z.string(),
});

export const LaundryGeneralSettingsSchema = z.object({
    campuses: z.array(CampusConfigSchema),
    pricing: LaundryPricingSchema,
    manualOverride: z
        .object({
            status: z.enum(["open", "closed"]),
        })
        .nullable()
        .optional(),
});

export const LaundrySlotsSchema = z.object({
    slots: z.array(z.string()),
});
