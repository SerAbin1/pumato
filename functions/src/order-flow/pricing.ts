/**
 * Cart pricing shared by the web checkout (lib/cartPricing.ts re-exports it)
 * and the order-flow Cloud Functions, so a server-priced order always matches
 * what the customer saw in the cart.
 *
 * No path aliases or third-party imports: functions/ compiles this file too.
 */

// --- Delivery weight ---

// Every menu item carries a signed delivery weight. The sign says how the item
// counts towards the extra delivery charge, the magnitude says by how much:
//
//    1 — normal, one unit per qty
//    2 — heavy, one qty is two units
//   -2 — light, two qty count as one unit
//
// Items that predate the field, or carry a zero/unparseable value, are normal.
//
// A variant may carry its own weight (a large pizza at 2 while the item is 1).
// It overrides the item's weight; a variant without one inherits it.
type WeightValue = string | number | null | undefined;

/** Anything that can carry a delivery weight: a menu item, a variant, or a cart line. */
export interface Weighted {
    weight?: WeightValue;
    variant?: { weight?: WeightValue } | null;
}

const parseWeight = (value: WeightValue): number | null => {
    const weight = parseInt(value as string);
    return Number.isFinite(weight) && weight !== 0 ? weight : null;
};

// The variant's own weight, or null when it inherits the item's.
export const getVariantWeight = (variant: { weight?: WeightValue } | null | undefined) =>
    parseWeight(variant?.weight);

// Accepts a menu item or a cart line; a cart line's selected variant wins.
export const getItemWeight = (item: Weighted | null | undefined): number =>
    getVariantWeight(item?.variant) ?? parseWeight(item?.weight) ?? 1;

export const isLightItem = (item: Weighted | null | undefined): boolean => getItemWeight(item) < 0;
export const isHeavyItem = (item: Weighted | null | undefined): boolean => getItemWeight(item) > 1;

// --- Shapes pricing reads ---

type NumberLike = string | number | null | undefined;

/** Anything priced like a cart line: has a quantity and a price. */
export interface PricedLine {
    price: string | number;
    unitPrice?: number;
    quantity: number;
}

/** The subset of a restaurant that pricing reads. */
export interface PricingRestaurant {
    id: string;
    name: string;
    baseDeliveryCharge?: string;
    extraItemThreshold?: string;
    extraItemCharge?: string;
    minOrderAmount?: string;
}

/** Campus entries need only what pricing reads. */
export interface PricingCampus {
    id: string;
    name: string;
    deliveryCharge: NumberLike;
}

export type PricingSettings =
    | {
          baseDeliveryCharge?: string;
          extraItemThreshold?: string;
          extraItemCharge?: string;
          lightItemThreshold?: string;
          deliveryCampusConfig?: PricingCampus[];
      }
    | null
    | undefined;

/** A coupon as discounts read it; both the stored snake_case and mapped camelCase. */
export interface PricingCoupon {
    type?: string;
    value?: string | number;
    minOrder?: string | number;
    min_order?: string | number;
    itemId?: string | null;
    item_id?: string | null;
}

/** A cart line as delivery pricing reads it. */
type DeliveryLine = Weighted & { quantity: number; restaurantId?: string };

/** A cart line as coupon discounts read it. */
type DiscountLine = PricedLine & { id: string; category?: string };

/** A cart line as the min-order check reads it. */
type MinOrderLine = PricedLine & { restaurantId?: string };

// --- Validations & Parsing ---

const isValid = (v: NumberLike): v is string | number =>
    v !== undefined && v !== null && v !== "" && !isNaN(parseInt(String(v)));

const getParam = (global: NumberLike, rest: NumberLike, def: number): number => {
    if (isValid(global)) return parseInt(String(global));
    if (isValid(rest)) return parseInt(String(rest));
    return def;
};

const lineUnitPrice = (item: PricedLine): number =>
    typeof item.unitPrice === "number" ? item.unitPrice : Number(item.price) || 0;

// --- Item Totals ---

export const calculateItemTotal = (cartItems: PricedLine[]): number => {
    return cartItems.reduce((sum, item) => sum + lineUnitPrice(item) * item.quantity, 0);
};

export const calculateTotalItems = (cartItems: PricedLine[]): number => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
};

// --- Delivery Charge Logic ---

export const calculateDeliveryCharge = (
    cartItems: DeliveryLine[],
    orderSettings: PricingSettings,
    currentRestaurant: Partial<PricingRestaurant> | null | undefined,
    userDetails: { campus: string }
) => {
    // 1. Base Charge
    let baseCharge = getParam(
        orderSettings?.baseDeliveryCharge,
        currentRestaurant?.baseDeliveryCharge,
        30
    );
    const threshold = getParam(
        orderSettings?.extraItemThreshold,
        currentRestaurant?.extraItemThreshold,
        3
    );
    const extraChargeAmt = getParam(
        orderSettings?.extraItemCharge,
        currentRestaurant?.extraItemCharge,
        10
    );

    // 2. Multi-Restaurant Surcharge
    const uniqueRestaurants = new Set(cartItems.map((item) => item.restaurantId).filter(Boolean));
    if (uniqueRestaurants.size > 1) {
        baseCharge += (uniqueRestaurants.size - 1) * 10;
    }

    // 3. Unit-Based Dynamic Delivery Logic
    // Normal and heavy items share one pool, measured against the free threshold.
    // Light items pool separately and only bill in whole bundles of `lightItemThreshold`.

    const lightItemThreshold = parseInt(orderSettings?.lightItemThreshold ?? "") || 5;

    let weightedUnits = 0;
    let lightUnits = 0;

    cartItems.forEach((item) => {
        const weight = getItemWeight(item);
        if (weight < 0) {
            lightUnits += item.quantity / Math.abs(weight);
        } else {
            weightedUnits += weight * item.quantity;
        }
    });

    // Surcharge units: normal/heavy units past the threshold, plus whole light bundles.
    const extraWeightedUnits = Math.max(0, weightedUnits - threshold);
    const extraLightUnits =
        lightItemThreshold > 0 ? Math.floor(lightUnits / lightItemThreshold) : 0;

    const totalExtraUnits = extraWeightedUnits + extraLightUnits;
    const largeOrderSurcharge = totalExtraUnits * extraChargeAmt;

    // 4. Campus Delivery Charge. Matches by ID or Name (legacy support); a campus
    // missing from the config (or no config at all) adds nothing.
    const campusConfig = orderSettings?.deliveryCampusConfig || [];
    const selectedCampus =
        campusConfig.find((c) => c.id === userDetails.campus) ||
        campusConfig.find((c) => c.name === userDetails.campus);
    const campusDeliveryCharge = selectedCampus ? Number(selectedCampus.deliveryCharge) || 0 : 0;

    return {
        deliveryCharge: baseCharge + largeOrderSurcharge + campusDeliveryCharge,
        largeOrderSurcharge,
        campusDeliveryCharge,
        hasHeavyItems: cartItems.some(isHeavyItem), // Helper for UI
        isMultiRestaurant: uniqueRestaurants.size > 1,
    };
};

// --- Discount Logic ---

export const calculateDiscount = (
    activeCoupon: PricingCoupon | null | undefined,
    itemTotal: number,
    cartItems: DiscountLine[]
): number => {
    if (!activeCoupon) return 0;

    // 1. Validate Min Order (Always applies to subtotal)
    // Supports both camelCase (internal) and snake_case (DB) props just in case
    const minOrder = parseInt(String(activeCoupon.minOrder || activeCoupon.min_order || "0"));
    if (itemTotal < minOrder) return 0;

    // 2. Handle Item-Specific or BOGO
    const targetId = activeCoupon.itemId || activeCoupon.item_id;
    if (targetId) {
        const isCategoryTarget = targetId.startsWith("CATEGORY:");
        const targetItems = isCategoryTarget
            ? cartItems.filter(
                  (i) =>
                      (i.category || "").trim().toLowerCase() ===
                      targetId.replace("CATEGORY:", "").trim().toLowerCase()
              )
            : cartItems.filter((i) => String(i.id) === String(targetId));

        if (targetItems.length === 0) return 0;

        const totalQty = targetItems.reduce((s, i) => s + i.quantity, 0);
        const totalItemsPrice = targetItems.reduce((s, i) => s + lineUnitPrice(i) * i.quantity, 0);

        // For BOGO/B2G1, we assume items are similar in price or use the first one encountered
        const unitPrice = lineUnitPrice(targetItems[0]);

        if (activeCoupon.type === "BOGO") {
            // Unlimited BOGO: floor(qty / 2) * price
            return Math.floor(totalQty / 2) * unitPrice;
        } else if (activeCoupon.type === "B2G1") {
            // Unlimited B2G1: floor(qty / 3) * price
            return Math.floor(totalQty / 3) * unitPrice;
        } else if (activeCoupon.type === "PERCENTAGE") {
            // Percentage off ALL matching items
            return Math.round(totalItemsPrice * (parseInt(String(activeCoupon.value)) / 100));
        } else {
            // Flat off ALL matching items (capped at total price of matching items)
            return Math.min(totalItemsPrice, parseInt(String(activeCoupon.value)));
        }
    }

    // 3. Global Discounts
    if (activeCoupon.type === "FLAT") {
        return Math.min(itemTotal, parseInt(String(activeCoupon.value)));
    } else if (activeCoupon.type === "PERCENTAGE") {
        const calculated = Math.round(itemTotal * (parseInt(String(activeCoupon.value)) / 100));
        return Math.min(calculated, 100); // Keeping the safety cap of 100 for global percentage
    }

    return 0;
};

// --- Min Order Shortfall ---

export interface MinOrderShortfall {
    restaurantId: string;
    restaurantName: string;
    minAmount: number;
    currentTotal: number;
    shortfall: number;
}

export const calculateMinOrderShortfalls = (
    cartItems: MinOrderLine[],
    restaurants: PricingRestaurant[]
): MinOrderShortfall[] => {
    const shortfalls: MinOrderShortfall[] = [];
    const restaurantTotals: Record<string, number> = {};

    // Calculate total per restaurant
    cartItems.forEach((item) => {
        if (item.restaurantId) {
            restaurantTotals[item.restaurantId] =
                (restaurantTotals[item.restaurantId] || 0) + lineUnitPrice(item) * item.quantity;
        }
    });

    // Check each restaurant's minimum
    Object.keys(restaurantTotals).forEach((restId) => {
        const restaurant = restaurants.find((r) => r.id === restId);
        if (restaurant && restaurant.minOrderAmount) {
            const minAmount = parseInt(restaurant.minOrderAmount);
            const currentTotal = restaurantTotals[restId];
            if (minAmount > 0 && currentTotal < minAmount) {
                shortfalls.push({
                    restaurantId: restId,
                    restaurantName: restaurant.name,
                    minAmount,
                    currentTotal,
                    shortfall: minAmount - currentTotal,
                });
            }
        }
    });

    return shortfalls;
};
