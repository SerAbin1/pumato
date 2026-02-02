"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { supabase } from "@/lib/supabase";

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [userDetails, setUserDetails] = useState({
        name: "",
        phone: "",
        address: "",
        instructions: ""
    });

    // 1. Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("pumato_user_details");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setUserDetails(prev => ({ ...prev, ...parsed }));
                } catch (e) {
                    console.error("Failed to parse saved user details", e);
                }
            }
        }
    }, []);

    // 2. Save to localStorage whenever userDetails changes
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("pumato_user_details", JSON.stringify(userDetails));
        }
    }, [userDetails]);

    // Data State
    const [restaurants, setRestaurants] = useState([]);
    const [availableCoupons, setAvailableCoupons] = useState([]);

    // Coupon State
    const [couponCode, setCouponCode] = useState(null);
    const [activeCoupon, setActiveCoupon] = useState(null);

    // Site Settings State
    const [orderSettings, setOrderSettings] = useState({
        slots: [{ start: "18:30", end: "23:00" }]
    });
    const [grocerySettings, setGrocerySettings] = useState({
        slots: [{ start: "10:00", end: "22:00" }]
    });

    useEffect(() => {
        // Fetch Restaurants directly from Firestore
        const fetchRestaurants = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "restaurants"));
                const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setRestaurants(data);
            } catch (err) {
                console.error("Failed to fetch restaurants", err);
            }
        };

        // Fetch Promo Codes directly from Supabase
        const fetchCoupons = async () => {
            try {
                const { data, error } = await supabase
                    .from("promocodes")
                    .select("*")
                    .eq("is_visible", true);

                if (error) throw error;
                // Map to camelCase for frontend consistency
                const mapped = (data || []).map(c => ({
                    ...c,
                    minOrder: c.min_order,
                    isVisible: c.is_visible,
                    usageLimit: c.usage_limit,
                    usedCount: c.used_count,
                    restaurantId: c.restaurant_id,
                    itemId: c.item_id
                }));
                setAvailableCoupons(mapped);
            } catch (err) {
                console.error("Failed to fetch coupons from Supabase", err);
            }
        };

        // Fetch Site Settings - Realtime
        const unsubscribeOrder = onSnapshot(doc(db, "site_content", "order_settings"), (settingsDoc) => {
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                if (data.startTime && !data.slots) {
                    // Legacy format: convert startTime/endTime to slots, keep all other fields
                    setOrderSettings({ ...data, slots: [{ start: data.startTime, end: data.endTime }] });
                } else {
                    setOrderSettings(data);
                }
            }
        });

        const unsubscribeGrocery = onSnapshot(doc(db, "site_content", "grocery_settings"), (settingsDoc) => {
            if (settingsDoc.exists()) {
                setGrocerySettings(settingsDoc.data());
            }
        });

        fetchRestaurants();
        fetchCoupons();

        return () => {
            unsubscribeOrder();
            unsubscribeGrocery();
        };
    }, []);

    // Calculate totals
    const itemTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Dynamic Delivery Logic
    const uniqueRestaurants = new Set(cartItems.map(item => item.restaurantId).filter(Boolean));
    const isMultiRestaurant = uniqueRestaurants.size > 1;

    const currentRestaurant = itemsHasRestaurant() ? restaurants.find(r => r.id === cartItems[0].restaurantId) : null;

    // Default values if not configured
    const defaultBaseCharge = orderSettings?.baseDeliveryCharge ? parseInt(orderSettings.baseDeliveryCharge) : 30;
    const defaultThreshold = orderSettings?.extraItemThreshold ? parseInt(orderSettings.extraItemThreshold) : 3;
    const defaultExtraCharge = orderSettings?.extraItemCharge ? parseInt(orderSettings.extraItemCharge) : 10;

    let baseCharge = currentRestaurant?.baseDeliveryCharge ? parseInt(currentRestaurant.baseDeliveryCharge) : defaultBaseCharge;

    // Add ₹10 for each additional restaurant beyond the first
    if (uniqueRestaurants.size > 1) {
        baseCharge += (uniqueRestaurants.size - 1) * 10;
    }

    const threshold = currentRestaurant?.extraItemThreshold ? parseInt(currentRestaurant.extraItemThreshold) : defaultThreshold;
    const extraChargeAmt = currentRestaurant?.extraItemCharge ? parseInt(currentRestaurant.extraItemCharge) : defaultExtraCharge;

    // Light Items Logic: Light items bundle before counting towards surcharge
    const lightItemIds = orderSettings?.lightItems || [];
    const lightItemThreshold = parseInt(orderSettings?.lightItemThreshold) || 5;

    let regularItemCount = 0;
    let lightItemCount = 0;

    cartItems.forEach(item => {
        if (lightItemIds.includes(item.id)) {
            lightItemCount += item.quantity;
        } else {
            regularItemCount += item.quantity;
        }
    });

    // Calculate effective items: each bundle of light items counts as 1 item
    const effectiveLightItems = Math.floor(lightItemCount / lightItemThreshold);
    const effectiveTotalItems = regularItemCount + effectiveLightItems;

    // Large Order Surcharge: Add extra charge for EACH item beyond threshold
    const itemsOverThreshold = Math.max(0, effectiveTotalItems - threshold);
    const largeOrderSurcharge = itemsOverThreshold * extraChargeAmt;
    const deliveryCharge = baseCharge + largeOrderSurcharge;

    // Calculate per-restaurant totals and check minimum order requirements
    const minOrderShortfalls = (() => {
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
    })();

    // Calculate Discount Reactively
    // activeCoupon is now managed via state in applyCoupon for better synchronization

    const discount = (() => {
        if (!activeCoupon) return 0;

        // 1. Validate Min Order (Always applies to subtotal)
        if (itemTotal < parseInt(activeCoupon.minOrder || activeCoupon.min_order || "0")) return 0;

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
    })();

    const finalTotal = Math.max(0, itemTotal + deliveryCharge - discount);

    const applyCoupon = async (code) => {
        const uppercaseCode = code.toUpperCase();

        try {
            // Fetch fresh from Supabase to show network activity and ensure latest limits
            const { data: coupon, error } = await supabase
                .from("promocodes")
                .select("*")
                .eq("code", uppercaseCode)
                .single();

            if (error || !coupon) {
                return { success: false, message: "Invalid Coupon Code" };
            }

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

            setAvailableCoupons(prev => {
                const exists = prev.find(c => c.code === mappedCoupon.code);
                if (exists) {
                    return prev.map(c => c.code === mappedCoupon.code ? mappedCoupon : c);
                }
                return [...prev, mappedCoupon];
            });
            setCouponCode(mappedCoupon.code);
            setActiveCoupon(mappedCoupon);
            return { success: true, message: `Coupon Applied!` };
        } catch (err) {
            console.error("Coupon validation error:", err);
            return { success: false, message: "Validation error" };
        }
    };

    const removeCoupon = () => {
        setCouponCode(null);
        setActiveCoupon(null);
    };

    function itemsHasRestaurant() {
        return cartItems.length > 0 && cartItems[0].restaurantId;
    }

    const addToCart = (item, quantityDelta = 1) => {
        setCartItems((prev) => {
            const existing = prev.find((i) => i.id === item.id);
            if (existing) {
                return prev.map((i) =>
                    i.id === item.id ? { ...i, quantity: Math.max(0, i.quantity + quantityDelta) } : i
                ).filter(i => i.quantity > 0);
            }

            if (quantityDelta > 0) {
                return [...prev, { ...item, quantity: quantityDelta }];
            }
            return prev;
        });
    };

    const removeFromCart = (id) => {
        setCartItems((prev) => prev.filter((i) => i.id !== id));
    };

    const updateQuantity = (id, delta) => {
        setCartItems((prev) =>
            prev.map((i) => {
                if (i.id === id) {
                    const newQty = Math.max(0, i.quantity + delta);
                    return { ...i, quantity: newQty };
                }
                return i;
            }).filter((i) => i.quantity > 0)
        );
    };

    const clearCart = () => setCartItems([]);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                isCartOpen,
                setIsCartOpen,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                userDetails,
                setUserDetails,
                itemTotal,
                deliveryCharge,
                finalTotal,
                totalItems,
                couponCode,
                discount,
                applyCoupon,
                removeCoupon,
                availableCoupons,
                activeCoupon,
                isMultiRestaurant,
                orderSettings,
                grocerySettings,
                paymentQR: orderSettings?.paymentQR,
                foodDeliveryNumber: orderSettings?.whatsappNumber || "919048086503",
                laundryNumber: orderSettings?.laundryWhatsappNumber || "919048086503",
                groceryNumber: grocerySettings?.whatsappNumber || "919048086503",
                upiId: orderSettings?.upiId || "",
                minOrderShortfalls
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
