"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";
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
                setAvailableCoupons(data || []);
            } catch (err) {
                console.error("Failed to fetch coupons from Supabase", err);
            }
        };

        // Fetch Site Settings - Realtime
        const unsubscribeOrder = onSnapshot(doc(db, "site_content", "order_settings"), (settingsDoc) => {
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                if (data.startTime && !data.slots) {
                    setOrderSettings({ slots: [{ start: data.startTime, end: data.endTime }] });
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
    let baseCharge = currentRestaurant?.baseDeliveryCharge ? parseInt(currentRestaurant.baseDeliveryCharge) : 30;

    // Add ₹10 for each additional restaurant beyond the first
    if (uniqueRestaurants.size > 1) {
        baseCharge += (uniqueRestaurants.size - 1) * 10;
    }

    const threshold = currentRestaurant?.extraItemThreshold ? parseInt(currentRestaurant.extraItemThreshold) : 3;
    const extraChargeAmt = currentRestaurant?.extraItemCharge ? parseInt(currentRestaurant.extraItemCharge) : 10;

    // Large Order Surcharge: Add ₹10 for EACH item beyond threshold
    const itemsOverThreshold = Math.max(0, totalItems - threshold);
    const largeOrderSurcharge = itemsOverThreshold * extraChargeAmt;
    const deliveryCharge = baseCharge + largeOrderSurcharge;

    // Calculate Discount Reactively
    const activeCoupon = availableCoupons.find(c => c.code === couponCode);

    const discount = (() => {
        if (!activeCoupon) return 0;

        // 1. Validate Min Order (Always applies to subtotal)
        if (itemTotal < parseInt(activeCoupon.min_order || "0")) return 0;

        // 2. Handle Item-Specific or BOGO
        if (activeCoupon.item_id) {
            const targetItems = cartItems.filter(i => i.id === activeCoupon.item_id);
            if (targetItems.length === 0) return 0;

            const totalQty = targetItems.reduce((s, i) => s + i.quantity, 0);
            const unitPrice = targetItems[0].price;

            if (activeCoupon.type === "BOGO") {
                // Unlimited BOGO: floor(qty / 2) * price
                return Math.floor(totalQty / 2) * unitPrice;
            } else if (activeCoupon.type === "PERCENTAGE") {
                // Percentage off ONLY that item
                return Math.round((totalQty * unitPrice) * (parseInt(activeCoupon.value) / 100));
            } else {
                // Flat off ONLY that item (e.g. ₹50 off this pizza)
                return Math.min(totalQty * unitPrice, parseInt(activeCoupon.value));
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

    const applyCoupon = (code) => {
        const uppercaseCode = code.toUpperCase();

        // Find coupon in available list
        const coupon = availableCoupons.find(c => c.code === uppercaseCode);

        if (!coupon) {
            return { success: false, message: "Invalid Coupon Code" };
        }

        // Initial validation
        if (itemTotal < parseInt(coupon.min_order || "0")) {
            return { success: false, message: `Min order ₹${coupon.min_order} for ${coupon.code}` };
        }

        setCouponCode(coupon.code);
        return { success: true, message: `Coupon Applied!` };
    };

    const removeCoupon = () => {
        setCouponCode(null);
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
                paymentQR: orderSettings?.paymentQR
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
