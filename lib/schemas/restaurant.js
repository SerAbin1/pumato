import { z } from "zod";

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
    categories: z.array(z.string()),
    outOfStockCategories: z.array(z.string()).optional(),
    menu: z.array(MenuItemSchema).optional(),
});
