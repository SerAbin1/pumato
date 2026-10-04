import type { CustomLink } from "@/lib/types";

/** The seller's request form on /marketplace/sell. */
export interface SellFormData {
    itemName: string;
    description: string;
    askingPrice: string;
    campus: string;
    sellerName: string;
    sellerWhatsApp: string;
    customLinks: CustomLink[];
}

/** Form fields a marketplace category can require or allow. */
export type MarketplaceField =
    | "itemName"
    | "description"
    | "askingPrice"
    | "campus"
    | "customLinks";
