import { z } from "zod";

const PreOrderSlotSchema = z.object({
    start: z.string(),
    end: z.string(),
    cutoffMinutes: z.coerce.number().min(0).optional(),
    // Window ("HH:MM" each) during which admin reviews/confirms orders for this slot, e.g. 6:30 PM - 7:00 PM.
    processingStart: z.string().optional().default(""),
    processingEnd: z.string().optional().default(""),
});

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
    isPreOrderEnabled: z.boolean().optional(),
    preOrderSlots: z.array(PreOrderSlotSchema).optional(),
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
    baseDeliveryCharge: z.string().optional(),
    extraItemThreshold: z.string().optional(),
    extraItemCharge: z.string().optional(),
    minOrderAmount: z.string().optional(),
    lightItems: z.array(z.string()).optional(),
    lightItemThreshold: z.string().optional(),
    heavyItems: z.array(z.string()).optional(),
    heavyItemCharge: z.string().optional(),
    deliveryCampusConfig: z.array(DeliveryCampusConfigSchema).optional(),
    manualOverride: ManualOverrideSchema.optional(),
    whatsappNumber: z.string().optional(),
    laundryWhatsappNumber: z.string().optional(),
    paymentQR: z.string().optional(),
    upiPayeeName: z.string().optional(),
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

const GroceryCampusPreOrderConfigSchema = z.object({
    id: z.string(),
    isPreOrderEnabled: z.boolean().optional(),
    preOrderSlots: z.array(PreOrderSlotSchema).optional(),
});

export const GrocerySettingsSchema = z.object({
    whatsappNumber: z.string().optional(),
    manualOverride: ManualOverrideSchema.optional(),
    service_hours: z.array(SlotSchema).optional(),
    campusPreOrder: z.array(GroceryCampusPreOrderConfigSchema).optional(),
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
