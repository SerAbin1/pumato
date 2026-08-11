import { z } from "zod";

const CustomLinkSchema = z.object({
    label: z.string(),
    link: z.string(),
});

export const MarketplaceListingSchema = z.object({
    id: z.string(),
    itemName: z.string(),
    description: z.string(),
    askingPrice: z.number(),
    category: z.string(),
    campus: z.string(),
    sellerName: z.string(),
    sellerWhatsApp: z.string(),
    images: z.array(z.string()),
    isVisible: z.boolean(),
    expiryDate: z.string(),
    customLinks: z.array(CustomLinkSchema).optional(),
    createdAt: z.any(),
});

export const MarketplaceRequestSchema = z.object({
    itemName: z.string(),
    description: z.string(),
    askingPrice: z.number(),
    category: z.string(),
    campus: z.string(),
    sellerName: z.string(),
    sellerWhatsApp: z.string(),
    customLinks: z.array(CustomLinkSchema).optional(),
    status: z.enum(["pending", "handled"]),
    createdAt: z.any(),
});
