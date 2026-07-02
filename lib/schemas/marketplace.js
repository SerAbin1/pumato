import { z } from "zod";
import { MARKETPLACE_CATEGORIES } from "@/lib/constants";

export const MarketplaceListingSchema = z.object({
    id: z.string(),
    itemName: z.string(),
    description: z.string(),
    askingPrice: z.number(),
    category: z.enum(MARKETPLACE_CATEGORIES),
    campus: z.string(),
    sellerName: z.string(),
    sellerWhatsApp: z.string(),
    images: z.array(z.string()),
    isVisible: z.boolean(),
    expiryDate: z.string(),
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
    status: z.enum(["pending", "handled"]),
    createdAt: z.any(),
});
