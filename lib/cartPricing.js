import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

// --- Validations & Parsing ---

const isValid = (v) => v !== undefined && v !== null && v !== "" && !isNaN(parseInt(v));

const getParam = (global, rest, def) => {
    if (isValid(global)) return parseInt(global);
    if (isValid(rest)) return parseInt(rest);
    return def;
};

// --- Item Totals ---

export const calculateItemTotal = (cartItems) => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
    return restaurants.find(r => r.id === cartItems[0].restaurantId) || null;
};

// --- Delivery Charge Logic ---

export const calculateDeliveryCharge = (
    cartItems,
    orderSettings,
    currentRestaurant,
    userDetails
) => {
    // 1. Base Charge
    let baseCharge = getParam(orderSettings?.baseDeliveryCharge, currentRestaurant?.baseDeliveryCharge, 30);
    const threshold = getParam(orderSettings?.extraItemThreshold, currentRestaurant?.extraItemThreshold, 3);
    const extraChargeAmt = getParam(orderSettings?.extraItemCharge, currentRestaurant?.extraItemCharge, 10);

    // 2. Multi-Restaurant Surcharge
    const uniqueRestaurants = new Set(cartItems.map(item => item.restaurantId).filter(Boolean));
    if (uniqueRestaurants.size > 1) {
        baseCharge += (uniqueRestaurants.size - 1) * 10;
    }

    // 3. Unit-Based Dynamic Delivery Logic
    // Rule:
    // 1 Nominal Item = 1 Unit
    // 1 Heavy Item  = 3 Units
    // Light Items: Count as 1 Surcharge Unit PER THRESHOLD exceeded (e.g., if threshold is 5, 5 items = 1 unit)

    const heavyItemIds = orderSettings?.heavyItems || [];
    const lightItemIds = orderSettings?.lightItems || [];
    const lightItemThreshold = parseInt(orderSettings?.lightItemThreshold) || 5;

    let totalNormalHeavyUnits = 0;
    let lightItemCount = 0;

    cartItems.forEach(item => {
        if (heavyItemIds.includes(item.id)) {
            // Heavy items count as 3 units
            totalNormalHeavyUnits += (3 * item.quantity);
        } else if (lightItemIds.includes(item.id)) {
            // Light items are tallied separately
            lightItemCount += item.quantity;
        } else {
            // Normal items count as 1 unit
            totalNormalHeavyUnits += (1 * item.quantity);
        }
    });

    // Calculate Surcharge Units
    // 1. Normal/Heavy Units above threshold
    const extraNormalHeavyUnits = Math.max(0, totalNormalHeavyUnits - threshold);

    // 2. Light Item Units (Directly added as surcharge units, separate from base threshold)
    let extraLightUnits = 0;
    if (lightItemThreshold > 0) {
        extraLightUnits = Math.floor(lightItemCount / lightItemThreshold);
    }

    const totalExtraUnits = extraNormalHeavyUnits + extraLightUnits;
    const largeOrderSurcharge = totalExtraUnits * extraChargeAmt;

    // 4. Campus Delivery Charge
    const campusConfig = orderSettings?.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG;
    // Helper to match campus by ID or Name (legacy support)
    const selectedCampus = campusConfig.find(c => c.id === userDetails.campus) || campusConfig.find(c => c.name === userDetails.campus);
    const campusDeliveryCharge = selectedCampus ? Number(selectedCampus.deliveryCharge) || 0 : 0;

    return {
        deliveryCharge: baseCharge + largeOrderSurcharge + campusDeliveryCharge,
        campusDeliveryCharge,
        hasHeavyItems: cartItems.some(item => heavyItemIds.includes(item.id)), // Helper for UI
        isMultiRestaurant: uniqueRestaurants.size > 1
    };
};

// --- Discount Logic ---

export const calculateDiscount = (activeCoupon, cartItems, itemTotal) => {
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
            ? cartItems.filter(i => (i.category || "").trim().toLowerCase() === targetId.replace("CATEGORY:", "").trim().toLowerCase())
            : cartItems.filter(i => String(i.id) === String(targetId));

        if (targetItems.length === 0) return 0;

        const totalQty = targetItems.reduce((s, i) => s + i.quantity, 0);
        const totalItemsPrice = targetItems.reduce((s, i) => s + (i.price * i.quantity), 0);

        // For BOGO/B2G1, we assume items are similar in price or use the first one encountered
        const unitPrice = targetItems[0].price;

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

export const validateCoupon = (coupon, itemTotal, cartItems) => {
    // Map to camelCase for local validation
    const mappedCoupon = {
        ...coupon,
        minOrder: coupon.min_order,
        isVisible: coupon.is_visible,
        isActive: coupon.is_active,
        usageLimit: coupon.usage_limit,
        usedCount: coupon.used_count,
        restaurantId: coupon.restaurant_id,
        itemId: coupon.item_id
    };

    // Check if coupon is active
    if (mappedCoupon.isActive === false) {
        return { success: false, message: "This coupon is currently inactive" };
    }

    // Initial validation
    if (itemTotal < parseInt(mappedCoupon.minOrder || "0")) {
        return { success: false, message: `Min order ₹${mappedCoupon.minOrder} for ${mappedCoupon.code}` };
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
    cartItems.forEach(item => {
        if (item.restaurantId) {
            if (!restaurantTotals[item.restaurantId]) {
                restaurantTotals[item.restaurantId] = 0;
            }
            restaurantTotals[item.restaurantId] += item.price * item.quantity;
        }
    });

    // Check each restaurant's minimum
    Object.keys(restaurantTotals).forEach(restId => {
        const restaurant = restaurants.find(r => r.id === restId);
        if (restaurant && restaurant.minOrderAmount) {
            const minAmount = parseInt(restaurant.minOrderAmount);
            const currentTotal = restaurantTotals[restId];
            if (minAmount > 0 && currentTotal < minAmount) {
                shortfalls.push({
                    restaurantId: restId,
                    restaurantName: restaurant.name,
                    minAmount,
                    currentTotal,
                    shortfall: minAmount - currentTotal
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
    const campus = config.find(c => c.id === campusId);
    return campus?.slots || [];
};
