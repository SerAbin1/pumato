import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import type { PricingCampus, PricingSettings } from "@/functions/src/order-flow/pricing";
import type { CartItem, Coupon, PreOrderSlot } from "@/lib/types";

// The pure pricing lives with the order-flow Cloud Functions so the server
// prices an order exactly as the cart did; the client-only helpers stay here.
export {
    calculateItemTotal,
    calculateTotalItems,
    calculateDeliveryCharge,
    calculateDiscount,
    calculateMinOrderShortfalls,
} from "@/functions/src/order-flow/pricing";
export type { MinOrderShortfall } from "@/functions/src/order-flow/pricing";

/** Campus entries as the slot helpers read them: pricing's fields plus slot config. */
type SlotCampus = PricingCampus & {
    slots?: { start: string; end: string }[];
    isPreOrderEnabled?: boolean;
    preOrderSlots?: PreOrderSlot[];
};

type SlotSettings =
    | (Omit<NonNullable<PricingSettings>, "deliveryCampusConfig"> & {
          deliveryCampusConfig?: SlotCampus[];
      })
    | null
    | undefined;

// --- Check Logic ---

export const itemsHasRestaurant = (cartItems: CartItem[]) => {
    return cartItems.length > 0 && cartItems[0].restaurantId;
};

export const getCurrentRestaurant = <R extends { id: string }>(
    cartItems: CartItem[],
    restaurants: R[]
): R | null => {
    if (!itemsHasRestaurant(cartItems)) return null;
    return restaurants.find((r) => r.id === cartItems[0].restaurantId) || null;
};

// --- Coupon Validation ---

export type CouponValidation =
    | { success: false; message: string }
    | { success: true; mappedCoupon: Coupon };

export const validateCoupon = (coupon: Coupon, itemTotal: number): CouponValidation => {
    // Map to camelCase for local validation
    const mappedCoupon: Coupon = {
        ...coupon,
        minOrder: coupon.min_order,
        isActive: coupon.is_active,
        usageLimit: coupon.usage_limit,
        usedCount: coupon.used_count,
        restaurantId: coupon.restaurant_id,
        itemId: coupon.item_id,
    };

    // Check if coupon is active
    if (mappedCoupon.isActive === false) {
        return { success: false, message: "This coupon is currently inactive" };
    }

    // Initial validation
    if (itemTotal < parseInt(String(mappedCoupon.minOrder || "0"))) {
        return {
            success: false,
            message: `Min order ₹${mappedCoupon.minOrder} for ${mappedCoupon.code}`,
        };
    }

    if (
        mappedCoupon.usageLimit &&
        Number(mappedCoupon.usedCount) >= Number(mappedCoupon.usageLimit)
    ) {
        return { success: false, message: "Coupon usage limit reached" };
    }

    return { success: true, mappedCoupon };
};

// --- Constants Helpers ---

export const getCampusSlots = (orderSettings: SlotSettings, campusId: string) => {
    if (!orderSettings) return [];
    const config: SlotCampus[] = orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG;
    const campus = config.find((c) => c.id === campusId);
    return campus?.slots || [];
};

// Matches by ID or Name (legacy support), same as calculateDeliveryCharge above.
export interface CampusPreOrderConfig {
    id: string | null;
    name: string | null;
    isPreOrderEnabled: boolean;
    preOrderSlots: PreOrderSlot[];
}

export const getCampusPreOrderConfig = (
    orderSettings: SlotSettings,
    campusIdentifier: string
): CampusPreOrderConfig => {
    const config: SlotCampus[] = orderSettings?.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG;
    const campus =
        config.find((c) => c.id === campusIdentifier) ||
        config.find((c) => c.name === campusIdentifier);
    return {
        id: campus?.id || null,
        name: campus?.name || null,
        isPreOrderEnabled: !!campus?.isPreOrderEnabled,
        preOrderSlots: campus?.preOrderSlots || [],
    };
};
