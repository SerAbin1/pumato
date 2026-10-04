import { z } from "zod";
import {
    DEFAULT_POPUP_COOLDOWN_HOURS,
    PROMOTION_SURFACES,
    deriveTier,
} from "@/lib/marketplacePromotions";

const CustomLinkSchema = z.object({
    type: z.string(),
    link: z.string(),
});

const ReachSchema = z.number().int().min(0).max(100).default(100);

const PromotionSchema = z
    .object({
        inFeed: z
            .object({
                enabled: z.boolean().default(false),
                reach: ReachSchema,
                surfaces: z.array(z.enum(PROMOTION_SURFACES.map((s) => s.id))).default([]),
            })
            .prefault({}),
        popup: z
            .object({
                enabled: z.boolean().default(false),
                reach: ReachSchema,
                // Not editable in the admin UI yet; stored per listing so it can be later
                cooldownHours: z.number().positive().default(DEFAULT_POPUP_COOLDOWN_HOURS),
            })
            .prefault({}),
        // Empty = all campuses
        targetCampuses: z.array(z.string()).default([]),
    })
    // Derived label, kept in sync on every save; used to query promoted listings
    .transform((p) => ({ ...p, tier: deriveTier(p) }));

export const MarketplaceListingSchema = z.object({
    id: z.string(),
    itemName: z.string().optional().default(""),
    description: z.string().optional().default(""),
    askingPrice: z.number().optional().default(0),
    filter: z.string().optional().default(""),
    campus: z.string().optional().default(""),
    sellerName: z.string(),
    sellerWhatsApp: z.string(),
    images: z.array(z.string()),
    isVisible: z.boolean(),
    expiryDate: z.string(),
    customLinks: z.array(CustomLinkSchema).optional(),
    promotion: PromotionSchema.optional(),
    createdAt: z.any(),
});

export const MarketplaceRequestSchema = z.object({
    itemName: z.string().optional().default(""),
    description: z.string().optional().default(""),
    askingPrice: z.number().optional().default(0),
    campus: z.string().optional().default(""),
    sellerName: z.string(),
    sellerWhatsApp: z.string(),
    customLinks: z.array(CustomLinkSchema).optional(),
    status: z.enum(["pending", "handled"]),
    createdAt: z.any(),
});
