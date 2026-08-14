import { z } from "zod";

const CustomLinkSchema = z.object({
    type: z.string(),
    link: z.string(),
});

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
