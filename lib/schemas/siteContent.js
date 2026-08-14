import { z } from "zod";

const DeliveryCampusConfigSchema = z.object({
    id: z.string(),
    name: z.string(),
    deliveryCharge: z.number(),
    slots: z.array(
        z.object({
            start: z.string(),
            end: z.string(),
        })
    ),
});

const WhatsAppGroupSchema = z.object({
    name: z.string(),
    link: z.string(),
});

const ManualOverrideSchema = z
    .object({
        status: z.enum(["open", "closed"]),
    })
    .nullable();

export const OrderSettingsSchema = z.object({
    baseDeliveryCharge: z.string(),
    extraItemThreshold: z.string(),
    extraItemCharge: z.string(),
    minOrderAmount: z.string(),
    lightItems: z.array(z.string()),
    lightItemThreshold: z.string(),
    heavyItems: z.array(z.string()).optional(),
    heavyItemCharge: z.string().optional(),
    deliveryCampusConfig: z.array(DeliveryCampusConfigSchema).optional(),
    manualOverride: ManualOverrideSchema.optional(),
    whatsappNumber: z.string().optional(),
    laundryWhatsappNumber: z.string().optional(),
    paymentQR: z.string().optional(),
    upiId: z.string().optional(),
    googleSheetUrl: z.string().optional(),
    whatsappGroups: z.array(WhatsAppGroupSchema).optional(),
});

const BannerSchema = z.object({
    title: z.string(),
    sub: z.string(),
    hidden: z.boolean(),
    gradient: z.string().optional(),
    image: z.string().optional(),
});

export const PromoBannersSchema = z.object({
    banner1: BannerSchema,
    banner2: BannerSchema,
    banner3: BannerSchema,
});

const SlotSchema = z.object({
    start: z.string(),
    end: z.string(),
});

export const GrocerySettingsSchema = z.object({
    whatsappNumber: z.string().optional(),
    manualOverride: ManualOverrideSchema.optional(),
    service_hours: z.array(SlotSchema).optional(),
    isDeliverySlotEnabled: z.boolean().optional(),
    delivery_hours: z.array(SlotSchema).optional(),
});

const MarketplaceCategorySchema = z.object({
    label: z.string(),
    actionLabel: z.string(),
    fields: z
        .array(z.enum(["itemName", "description", "askingPrice", "campus", "customLinks"]))
        .optional(),
    optionalFields: z
        .array(z.enum(["itemName", "description", "askingPrice", "campus", "customLinks"]))
        .optional(),
});

export const MarketplaceCategoriesSchema = z.object({
    categories: z.array(MarketplaceCategorySchema),
});

const MarketplaceFilterSchema = z.object({
    label: z.string(),
});

export const MarketplaceFiltersSchema = z.object({
    filters: z.array(MarketplaceFilterSchema),
});

const MarketplaceRedirectLinkSchema = z.object({
    label: z.string(),
    url: z.string().url(),
    active: z.boolean(),
});

export const MarketplaceRedirectLinksSchema = z.object({
    redirectLinks: z.array(MarketplaceRedirectLinkSchema),
});
