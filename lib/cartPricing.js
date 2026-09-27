import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import { getItemWeight, isHeavyItem } from "@/lib/restaurants/menuItem";

// --- Validations & Parsing ---

const isValid = (v) => v !== undefined && v !== null && v !== "" && !isNaN(parseInt(v));

const getParam = (global, rest, def) => {
    if (isValid(global)) return parseInt(global);
    if (isValid(rest)) return parseInt(rest);
    return def;
};

// --- Item Totals ---

export const calculateItemTotal = (cartItems) => {
    return cartItems.reduce((sum, item) => {
        const unitPrice =
            typeof item.unitPrice === "number" ? item.unitPrice : Number(item.price) || 0;
        return sum + unitPrice * item.quantity;
    }, 0);
};

export const calculateTotalItems = (cartItems) => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
};

// --- Check Logic ---

export const itemsHasRestaurant = (cartItems) => {
    return cartItems.length > 0 && cartItems[0].restaurantId;
};

export const getCurrentRestaurant = (cartItems, restaurants) => {
    if (!itemsHasRestaurant(cartItems)) return null;
    return restaurants.find((r) => r.id === cartItems[0].restaurantId) || null;
};

// --- Delivery Charge Logic ---

export const calculateDeliveryCharge = (
    cartItems,
    orderSettings,
    currentRestaurant,
    userDetails
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
    // Each item carries a signed weight (see lib/restaurants/menuItem.js):
    //   weight >= 1 — one qty is worth that many units
    //   weight <  0 — |weight| qty count as one unit
    // Normal and heavy items share one pool, measured against the free threshold.
    // Light items pool separately and only bill in whole bundles of `lightItemThreshold`.

    const lightItemThreshold = parseInt(orderSettings?.lightItemThreshold) || 5;

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

    // 4. Campus Delivery Charge
    const campusConfig = orderSettings?.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG;
    // Helper to match campus by ID or Name (legacy support)
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

export const calculateDiscount = (activeCoupon, itemTotal, cartItems) => {
    if (!activeCoupon) return 0;

    // 1. Validate Min Order (Always applies to subtotal)
    // Supports both camelCase (internal) and snake_case (DB) props just in case
    const minOrder = parseInt(activeCoupon.minOrder || activeCoupon.min_order || "0");
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
        const totalItemsPrice = targetItems.reduce((s, i) => {
            const unitPrice = typeof i.unitPrice === "number" ? i.unitPrice : Number(i.price) || 0;
            return s + unitPrice * i.quantity;
        }, 0);

        // For BOGO/B2G1, we assume items are similar in price or use the first one encountered
        const unitPrice = (() => {
            const i = targetItems[0];
            return typeof i.unitPrice === "number" ? i.unitPrice : Number(i.price) || 0;
        })();

        if (activeCoupon.type === "BOGO") {
            // Unlimited BOGO: floor(qty / 2) * price
            return Math.floor(totalQty / 2) * unitPrice;
        } else if (activeCoupon.type === "B2G1") {
            // Unlimited B2G1: floor(qty / 3) * price
            return Math.floor(totalQty / 3) * unitPrice;
        } else if (activeCoupon.type === "PERCENTAGE") {
            // Percentage off ALL matching items
            return Math.round(totalItemsPrice * (parseInt(activeCoupon.value) / 100));
        } else {
            // Flat off ALL matching items (capped at total price of matching items)
            return Math.min(totalItemsPrice, parseInt(activeCoupon.value));
        }
    }

    // 3. Global Discounts
    if (activeCoupon.type === "FLAT") {
        return Math.min(itemTotal, parseInt(activeCoupon.value));
    } else if (activeCoupon.type === "PERCENTAGE") {
        const calculated = Math.round(itemTotal * (parseInt(activeCoupon.value) / 100));
        return Math.min(calculated, 100); // Keeping the safety cap of 100 for global percentage
    }

    return 0;
};

// --- Coupon Validation ---

export const validateCoupon = (coupon, itemTotal) => {
    // Map to camelCase for local validation
    const mappedCoupon = {
        ...coupon,
        minOrder: coupon.min_order,
        isVisible: coupon.is_visible,
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
    if (itemTotal < parseInt(mappedCoupon.minOrder || "0")) {
        return {
            success: false,
            message: `Min order ₹${mappedCoupon.minOrder} for ${mappedCoupon.code}`,
        };
    }

    if (mappedCoupon.usageLimit && mappedCoupon.usedCount >= mappedCoupon.usageLimit) {
        return { success: false, message: "Coupon usage limit reached" };
    }

    return { success: true, mappedCoupon };
};

// --- Min Order Shortfall ---

export const calculateMinOrderShortfalls = (cartItems, restaurants) => {
    const shortfalls = [];
    const restaurantTotals = {};

    // Calculate total per restaurant
    cartItems.forEach((item) => {
        if (item.restaurantId) {
            if (!restaurantTotals[item.restaurantId]) {
                restaurantTotals[item.restaurantId] = 0;
            }
            const unitPrice =
                typeof item.unitPrice === "number" ? item.unitPrice : Number(item.price) || 0;
            restaurantTotals[item.restaurantId] += unitPrice * item.quantity;
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

// --- Constants Helpers ---

export const getCampusSlots = (orderSettings, campusId) => {
    if (!orderSettings) return [];
    const config = orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG;
    const campus = config.find((c) => c.id === campusId);
    return campus?.slots || [];
};

// Matches by ID or Name (legacy support), same as calculateDeliveryCharge above.
export const getCampusPreOrderConfig = (orderSettings, campusIdentifier) => {
    const config = orderSettings?.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG;
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
