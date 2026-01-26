"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
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

    // Data State
    const [restaurants, setRestaurants] = useState([]);
    const [availableCoupons, setAvailableCoupons] = useState([]);

    // Coupon State
    const [couponCode, setCouponCode] = useState(null);
    const [discount, setDiscount] = useState(0);

    // Site Settings State
    const [orderSettings, setOrderSettings] = useState({
        startTime: "18:30", // Default 6:30 PM
        endTime: "23:00"    // Default 11:00 PM
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

        // Fetch Site Settings
        const fetchSettings = async () => {
            try {
                const settingsSnap = await getDocs(collection(db, "site_content"));
                const orderSettingsDoc = settingsSnap.docs.find(d => d.id === "order_settings");
                if (orderSettingsDoc) {
                    setOrderSettings(orderSettingsDoc.data());
                }
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };

        fetchRestaurants();
        fetchCoupons();
        fetchSettings();
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
    const finalTotal = Math.max(0, itemTotal + deliveryCharge - discount);

    const applyCoupon = (code) => {
        const uppercaseCode = code.toUpperCase();

        // Find coupon in available list
        const coupon = availableCoupons.find(c => c.code === uppercaseCode);

        if (!coupon) {
            return { success: false, message: "Invalid Coupon Code" };
        }

        // Validate Min Order
        if (itemTotal < parseInt(coupon.minOrder)) {
            return { success: false, message: `Min order ₹${coupon.minOrder} for ${coupon.code}` };
        }

        // Calculate Discount
        let discAmt = 0;
        if (coupon.type === "FLAT") {
            discAmt = parseInt(coupon.value);
        } else if (coupon.type === "PERCENTAGE") {
            const calculated = Math.round(itemTotal * (parseInt(coupon.value) / 100));
            // Optional: Cap percentage discount if needed, for now assuming no cap or high cap
            discAmt = Math.min(calculated, 100); // Keeping the safety cap of 100 for now
        }

        setDiscount(discAmt);
        setCouponCode(coupon.code);
        return { success: true, message: `₹${discAmt} Discount Applied!` };
    };

    const removeCoupon = () => {
        setDiscount(0);
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
                isMultiRestaurant,
                orderSettings
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
