import { z } from "zod";
import { PreOrderSlotSchema } from "./siteContent";

export const ItemVariantSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.string(),
    // Overrides the item's delivery weight for this variant; absent inherits it.
    weight: z.coerce.number().int().optional(),
});

export const ItemAddonSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.string(),
});

export const MenuItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.string(),
    description: z.string(),
    category: z.string(),
    isVeg: z.boolean().nullable(),
    isVisible: z.boolean(),
    isBestSeller: z.boolean().optional(),
    extraInfo: z.string().optional(),
    hiddenAt: z.string().nullable().optional(),
    // Signed delivery weight: 1 normal, 2 heavy (one qty is two units),
    // -2 light (two qty count as one unit). See lib/restaurants/menuItem.js.
    weight: z.coerce.number().int().optional(),
    variants: z.array(ItemVariantSchema).optional(),
    addons: z.array(ItemAddonSchema).optional(),
});

export const RestaurantSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string(),
    cuisine: z.string(),
    deliveryTime: z.string(),
    offer: z.string().optional(),
    priceForTwo: z.string().optional(),
    baseDeliveryCharge: z.string(),
    extraItemThreshold: z.string(),
    extraItemCharge: z.string(),
    minOrderAmount: z.string(),
    isVisible: z.boolean(),
    isAvailable: z.boolean().optional(),
    // Admin-only. Featured restaurants lead the daily shuffle on /delivery.
    isFeatured: z.boolean().optional(),
    categories: z.array(z.string()),
    outOfStockCategories: z.array(z.string()).optional(),
    menu: z.array(MenuItemSchema).optional(),
    isPreOrderEnabled: z.boolean().optional(),
    preOrderSlots: z.array(PreOrderSlotSchema).optional(),
});
