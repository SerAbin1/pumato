import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

const isValid = (value) => value !== undefined && value !== null && value !== "" && !isNaN(parseInt(value, 10));

const getParam = (globalValue, restaurantValue, fallbackValue) => {
    if (isValid(globalValue)) return parseInt(globalValue, 10);
    if (isValid(restaurantValue)) return parseInt(restaurantValue, 10);
    return fallbackValue;
};

export const calculateItemTotal = (cartItems) => (
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

export const calculateTotalItems = (cartItems) => (
    cartItems.reduce((sum, item) => sum + item.quantity, 0)
);

export const itemsHaveRestaurant = (cartItems) => (
    cartItems.length > 0 && cartItems[0].restaurantId
);

export const getCurrentRestaurant = (cartItems, restaurants) => {
    if (!itemsHaveRestaurant(cartItems)) return null;
    return restaurants.find((restaurant) => restaurant.id === cartItems[0].restaurantId) || null;
};

export const calculateDeliveryCharge = (
    cartItems,
    orderSettings,
    currentRestaurant,
    userDetails
) => {
    let baseCharge = getParam(orderSettings?.baseDeliveryCharge, currentRestaurant?.baseDeliveryCharge, 30);
    const threshold = getParam(orderSettings?.extraItemThreshold, currentRestaurant?.extraItemThreshold, 3);
    const extraChargeAmount = getParam(orderSettings?.extraItemCharge, currentRestaurant?.extraItemCharge, 10);

    const uniqueRestaurants = new Set(cartItems.map((item) => item.restaurantId).filter(Boolean));
    if (uniqueRestaurants.size > 1) {
        baseCharge += (uniqueRestaurants.size - 1) * 10;
    }

    const heavyItemIds = orderSettings?.heavyItems || [];
    const lightItemIds = orderSettings?.lightItems || [];
    const lightItemThreshold = parseInt(orderSettings?.lightItemThreshold, 10) || 5;

    let totalNormalHeavyUnits = 0;
    let lightItemCount = 0;

    cartItems.forEach((item) => {
        if (heavyItemIds.includes(item.id)) {
            totalNormalHeavyUnits += 3 * item.quantity;
        } else if (lightItemIds.includes(item.id)) {
            lightItemCount += item.quantity;
        } else {
            totalNormalHeavyUnits += item.quantity;
        }
    });

    const extraNormalHeavyUnits = Math.max(0, totalNormalHeavyUnits - threshold);
    const extraLightUnits = lightItemThreshold > 0 ? Math.floor(lightItemCount / lightItemThreshold) : 0;
    const totalExtraUnits = extraNormalHeavyUnits + extraLightUnits;
    const largeOrderSurcharge = totalExtraUnits * extraChargeAmount;

    const campusConfig = orderSettings?.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG;
    const selectedCampus = campusConfig.find((campus) => campus.id === userDetails.campus)
        || campusConfig.find((campus) => campus.name === userDetails.campus);
    const campusDeliveryCharge = selectedCampus ? Number(selectedCampus.deliveryCharge) || 0 : 0;

    return {
        deliveryCharge: baseCharge + largeOrderSurcharge + campusDeliveryCharge,
        campusDeliveryCharge,
        hasHeavyItems: cartItems.some((item) => heavyItemIds.includes(item.id)),
        isMultiRestaurant: uniqueRestaurants.size > 1
    };
};

export const calculateDiscount = (activeCoupon, cartItems, itemTotal) => {
    if (!activeCoupon) return 0;

    const minOrder = parseInt(activeCoupon.minOrder || activeCoupon.min_order || "0", 10);
    if (itemTotal < minOrder) return 0;

    const targetId = activeCoupon.itemId || activeCoupon.item_id;
    if (targetId) {
        const isCategoryTarget = targetId.startsWith("CATEGORY:");
        const targetItems = isCategoryTarget
            ? cartItems.filter((item) => (item.category || "").trim().toLowerCase() === targetId.replace("CATEGORY:", "").trim().toLowerCase())
            : cartItems.filter((item) => String(item.id) === String(targetId));

        if (targetItems.length === 0) return 0;

        const totalQty = targetItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalItemsPrice = targetItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const unitPrice = targetItems[0].price;

        if (activeCoupon.type === "BOGO") return Math.floor(totalQty / 2) * unitPrice;
        if (activeCoupon.type === "B2G1") return Math.floor(totalQty / 3) * unitPrice;
        if (activeCoupon.type === "PERCENTAGE") {
            return Math.round(totalItemsPrice * (parseInt(activeCoupon.value, 10) / 100));
        }

        return Math.min(totalItemsPrice, parseInt(activeCoupon.value, 10));
    }

    if (activeCoupon.type === "FLAT") {
        return Math.min(itemTotal, parseInt(activeCoupon.value, 10));
    }

    if (activeCoupon.type === "PERCENTAGE") {
        const calculatedDiscount = Math.round(itemTotal * (parseInt(activeCoupon.value, 10) / 100));
        return Math.min(calculatedDiscount, 100);
    }

    return 0;
};

export const validateCoupon = (coupon, itemTotal) => {
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

    if (mappedCoupon.isActive === false) {
        return { success: false, message: "This coupon is currently inactive" };
    }

    if (itemTotal < parseInt(mappedCoupon.minOrder || "0", 10)) {
        return { success: false, message: `Min order ₹${mappedCoupon.minOrder} for ${mappedCoupon.code}` };
    }

    if (mappedCoupon.usageLimit && mappedCoupon.usedCount >= mappedCoupon.usageLimit) {
        return { success: false, message: "Coupon usage limit reached" };
    }

    return { success: true, mappedCoupon };
};

export const calculateMinOrderShortfalls = (cartItems, restaurants) => {
    const shortfalls = [];
    const restaurantTotals = {};

    cartItems.forEach((item) => {
        if (item.restaurantId) {
            if (!restaurantTotals[item.restaurantId]) {
                restaurantTotals[item.restaurantId] = 0;
            }
            restaurantTotals[item.restaurantId] += item.price * item.quantity;
        }
    });

    Object.keys(restaurantTotals).forEach((restaurantId) => {
        const restaurant = restaurants.find((candidate) => candidate.id === restaurantId);
        if (restaurant && restaurant.minOrderAmount) {
            const minAmount = parseInt(restaurant.minOrderAmount, 10);
            const currentTotal = restaurantTotals[restaurantId];
            if (minAmount > 0 && currentTotal < minAmount) {
                shortfalls.push({
                    restaurantId,
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

export const getCampusSlots = (orderSettings, campusId) => {
    if (!orderSettings) return [];
    const config = orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG;
    const campus = config.find((candidate) => candidate.id === campusId)
        || config.find((candidate) => candidate.name === campusId);
    return campus?.slots || [];
};
