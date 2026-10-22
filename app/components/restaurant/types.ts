import type { SlotDef } from "@/lib/preOrderSlots";
import type { MenuItem, Restaurant } from "@/lib/types";

/**
 * Editable shapes for the admin and partner forms. Inputs hold raw values
 * (an empty weight, a half-typed price) until the form normalises them on
 * save and the zod schema validates them in the repository.
 */
export interface VariantDraft {
    id: string;
    name: string;
    price: string;
    weight?: number | string | null;
}

export interface AddonDraft {
    id: string;
    name: string;
    price: string;
}

export interface MenuItemDraft extends Omit<MenuItem, "weight" | "variants" | "addons"> {
    weight?: number | string;
    variants?: VariantDraft[];
    addons?: AddonDraft[];
}

export interface RestaurantDraft extends Partial<
    Omit<Restaurant, "menu" | "categories" | "preOrderSlots">
> {
    categories: string[];
    menu: MenuItemDraft[];
    preOrderSlots?: SlotDef[];
}
