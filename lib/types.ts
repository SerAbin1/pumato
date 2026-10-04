/**
 * Shared domain types. Firestore documents are typed from their zod schemas
 * (lib/schemas) so the runtime validation and the static types can't drift.
 *
 * Documents read back from Firestore are not re-validated, and older documents
 * predate some fields, so the read-side types keep legacy fields optional.
 */
import type { z } from "zod";
import type {
    ItemAddonSchema,
    ItemVariantSchema,
    MenuItemSchema,
    RestaurantSchema,
} from "@/lib/schemas/restaurant";
import type {
    DeliverySlotSchema,
    ORDER_STATUSES,
    OrderItemSchema,
    OrderSchema,
} from "@/lib/schemas/order";
import type {
    LAUNDRY_ORDER_STATUSES,
    LaundryItemSchema,
    LaundryOrderSchema,
} from "@/lib/schemas/laundry";
import type {
    GrocerySettingsSchema,
    MarketplaceCategoriesSchema,
    MarketplaceFiltersSchema,
    MarketplaceRedirectLinksSchema,
    OrderSettingsSchema,
    PreOrderSlotSchema,
    PromoBannersSchema,
} from "@/lib/schemas/siteContent";
import type { MarketplaceListingSchema, MarketplaceRequestSchema } from "@/lib/schemas/marketplace";
import type { FeedbackSchema } from "@/lib/schemas/feedback";
import type { PAYMENT_STATUSES, PaymentSchema } from "@/lib/schemas/payment";
import type { CampusConfigSchema, LaundryPricingSchema } from "@/lib/schemas/settings";

/** A plain object whose shape isn't known yet (e.g. raw Firestore data). */
export type AnyRecord = Record<string, any>;

// --- Restaurants & menu ---

export type ItemVariant = z.infer<typeof ItemVariantSchema>;
export type ItemAddon = z.infer<typeof ItemAddonSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type Restaurant = z.infer<typeof RestaurantSchema>;
export type PreOrderSlot = z.infer<typeof PreOrderSlotSchema>;

// --- Cart ---

/** A variant/addon as chosen in the cart: prices already parsed to numbers. */
export interface SelectedOption {
    id: string;
    name: string;
    price: number;
    weight?: number | null;
}

/**
 * What gets added to the cart: a menu item (or grocery item) plus what the customer
 * picked. `price` stays as stored on the menu (string); `unitPrice` is the
 * computed price including variant and addons when present.
 */
export interface CartItemInput {
    id: string;
    name: string;
    price: string | number;
    unitPrice?: number;
    quantity?: number;
    cartKey?: string;
    restaurantId?: string;
    restaurantName?: string;
    category?: string;
    isVeg?: boolean | null;
    image?: string;
    weight?: number | string | null;
    variant?: SelectedOption;
    addons?: SelectedOption[];
    [key: string]: any;
}

/** A line in the cart: what was added, plus how many. */
export interface CartItem extends CartItemInput {
    quantity: number;
}

/** Anything priced like a cart line: has a quantity and a price. */
export type PricedLine = Pick<CartItem, "price" | "unitPrice" | "quantity">;

export interface UserDetails {
    name: string;
    phone: string;
    campus: string;
    address: string;
    instructions: string;
    [key: string]: any;
}

// --- Coupons (stored snake_case by functions/manage-coupons.js) ---

export type CouponType = "FLAT" | "PERCENTAGE" | "BOGO" | "B2G1";

export interface Coupon {
    id?: string;
    code: string;
    type: CouponType | string;
    value: string | number;
    description?: string;
    // snake_case as stored
    min_order?: string | number;
    is_visible?: boolean;
    is_active?: boolean;
    usage_limit?: string | number | null;
    used_count?: number;
    restaurant_id?: string | null;
    item_id?: string | null;
    // camelCase as mapped on the client
    minOrder?: string | number;
    isVisible?: boolean;
    isActive?: boolean;
    usageLimit?: string | number | null;
    usedCount?: number;
    restaurantId?: string | null;
    itemId?: string | null;
    [key: string]: any;
}

// --- Orders ---

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type DeliverySlot = z.infer<typeof DeliverySlotSchema>;
export type OrderInput = z.input<typeof OrderSchema>;
export type Order = z.infer<typeof OrderSchema> & { id: string };

// --- Laundry ---

export type LaundryOrderStatus = (typeof LAUNDRY_ORDER_STATUSES)[number];
export type LaundryItem = z.infer<typeof LaundryItemSchema>;
export type LaundryOrder = z.infer<typeof LaundryOrderSchema> & { [key: string]: any };
export type LaundryPricing = z.infer<typeof LaundryPricingSchema>;
export type CampusConfig = z.infer<typeof CampusConfigSchema>;

// --- Site content ---

export type OrderSettings = z.infer<typeof OrderSettingsSchema> & { [key: string]: any };
export type DeliveryCampusConfig = NonNullable<OrderSettings["deliveryCampusConfig"]>[number];
export type GrocerySettings = z.infer<typeof GrocerySettingsSchema> & { [key: string]: any };
export type PromoBanners = z.infer<typeof PromoBannersSchema>;
export type Banner = PromoBanners["banner1"];
export type MarketplaceCategories = z.infer<typeof MarketplaceCategoriesSchema>;
export type MarketplaceCategory = MarketplaceCategories["categories"][number];
export type MarketplaceFilters = z.infer<typeof MarketplaceFiltersSchema>;
export type MarketplaceRedirectLinks = z.infer<typeof MarketplaceRedirectLinksSchema>;

// --- Marketplace ---

/** A seller link. `label` only exists on links saved before the schema dropped it. */
export interface CustomLink {
    type: string;
    link: string;
    label?: string;
}

export type MarketplaceListing = Omit<z.infer<typeof MarketplaceListingSchema>, "customLinks"> & {
    customLinks?: CustomLink[];
    [key: string]: any;
};
export type MarketplaceRequest = z.infer<typeof MarketplaceRequestSchema> & {
    id: string;
    [key: string]: any;
};

// --- Feedback & payments ---

export type Feedback = z.infer<typeof FeedbackSchema> & { id: string };
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type Payment = z.infer<typeof PaymentSchema>;
