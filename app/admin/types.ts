import type { SlotDef } from "@/lib/preOrderSlots";
import type {
    DeliveryCampusConfig,
    GrocerySettings,
    MenuItem,
    OrderSettings,
    Restaurant,
} from "@/lib/types";
import type { ManualOverride } from "./components/ServiceOverrideControl";

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

export type CampusDeliveryDraft = Omit<DeliveryCampusConfig, "preOrderSlots"> & {
    preOrderSlots?: SlotDef[];
};

/** `site_content/order_settings` as the Delivery and Global tabs edit it. */
export type OrderSettingsDraft = Omit<OrderSettings, "deliveryCampusConfig" | "manualOverride"> & {
    deliveryCampusConfig?: CampusDeliveryDraft[];
    manualOverride?: ManualOverride | null;
};

export interface GroceryCampusPreOrderDraft {
    id: string;
    isPreOrderEnabled?: boolean;
    preOrderSlots?: SlotDef[];
}

/** `site_content/grocery_settings` as the Grocery and Global tabs edit it. */
export type GrocerySettingsDraft = Omit<GrocerySettings, "campusPreOrder" | "manualOverride"> & {
    campusPreOrder?: GroceryCampusPreOrderDraft[];
    manualOverride?: ManualOverride | null;
};

/** A settings editor's state and its setter, as useSettingsForm hands them out. */
export type SetDraft<T> = (next: T) => void;
