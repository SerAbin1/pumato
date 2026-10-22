import type { SlotDef } from "@/lib/preOrderSlots";
import type { StoredPromotion } from "@/lib/marketplacePromotions";
import type { CustomLink, DeliveryCampusConfig, GrocerySettings, OrderSettings } from "@/lib/types";
import type { ManualOverride } from "./components/ServiceOverrideControl";

/**
 * Editable shapes for the admin settings forms. Inputs hold raw values until
 * the form normalises them on save and the zod schema validates them in the
 * repository.
 */
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

/** A marketplace listing as the admin listing form edits it. */
export interface ListingDraft {
    id?: string;
    itemName: string;
    description: string;
    askingPrice: number | string;
    filter: string;
    campus: string;
    sellerName: string;
    sellerWhatsApp: string;
    images: string[];
    isVisible: boolean;
    expiryDate: string;
    customLinks: CustomLink[];
    promotion?: StoredPromotion | null;
    createdAt?: unknown;
}
