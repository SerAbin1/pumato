"use client";

import { createContext, useContext, useEffect, useReducer, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    useRestaurants,
    useCoupons,
    useOrderSettings,
    useGrocerySettings,
    useLaundrySettings
} from "@/app/hooks/useCartData";
import { cartReducer, initialState } from "./cartReducer";
import * as Pricing from "@/lib/cartPricing";

const CartContext = createContext();

export function CartProvider({ children }) {
    const [state, dispatch] = useReducer(cartReducer, initialState);

    // --- Data Hooks ---
    const { restaurants } = useRestaurants();
    const { availableCoupons, setAvailableCoupons } = useCoupons();
    const { orderSettings } = useOrderSettings();
    const { grocerySettings } = useGrocerySettings();
    const { laundrySettings } = useLaundrySettings();

    // --- Persistence ---
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("pumato_user_details");
            if (saved) {
                try {
                    dispatch({ type: "LOAD_USER_DETAILS", payload: JSON.parse(saved) });
                } catch (e) { console.error("Failed to parse saved user details", e); }
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("pumato_user_details", JSON.stringify(state.userDetails));
        }
    }, [state.userDetails]);


    // --- Derived State (Memoized Calculation) ---

    const itemTotal = useMemo(() => Pricing.calculateItemTotal(state.cartItems), [state.cartItems]);
    const totalItems = useMemo(() => Pricing.calculateTotalItems(state.cartItems), [state.cartItems]);

    const currentRestaurant = useMemo(() =>
        Pricing.getCurrentRestaurant(state.cartItems, restaurants),
        [state.cartItems, restaurants]
    );

    const deliveryMetrics = useMemo(() =>
        Pricing.calculateDeliveryCharge(
            state.cartItems,
            orderSettings,
            currentRestaurant,
            state.userDetails
        ),
        [state.cartItems, orderSettings, currentRestaurant, state.userDetails]
    );

    const discount = useMemo(() =>
        Pricing.calculateDiscount(state.activeCoupon, state.cartItems, itemTotal),
        [state.activeCoupon, state.cartItems, itemTotal]
    );

    const minOrderShortfalls = useMemo(() =>
        Pricing.calculateMinOrderShortfalls(state.cartItems, restaurants),
        [state.cartItems, restaurants]
    );

    const finalTotal = Math.max(0, itemTotal + deliveryMetrics.deliveryCharge - discount);


    // --- Actions ---

    const addToCart = (item, quantityDelta = 1) => dispatch({ type: "ADD_ITEM", payload: { item, quantityDelta } });
    const removeFromCart = (id) => dispatch({ type: "REMOVE_ITEM", payload: id });
    const updateQuantity = (id, delta) => dispatch({ type: "UPDATE_QUANTITY", payload: { id, delta } });
    const clearCart = () => dispatch({ type: "CLEAR_CART" });
    const setIsCartOpen = (isOpen) => dispatch({ type: "SET_CART_OPEN", payload: isOpen });
    const setUserDetails = (details) => {
        // Handle both functional updates and direct values to match useState API
        const newDetails = typeof details === 'function' ? details(state.userDetails) : details;
        dispatch({ type: "UPDATE_USER_DETAILS", payload: newDetails });
    };

    const applyCoupon = async (code) => {
        const uppercaseCode = code.toUpperCase();
        try {
            const { data: coupon, error } = await supabase
                .from("promocodes")
                .select("*")
                .eq("code", uppercaseCode)
                .single();

            if (error || !coupon) return { success: false, message: "Invalid Coupon Code" };

            const validation = Pricing.validateCoupon(coupon, itemTotal, state.cartItems);

            if (!validation.success) return { success: false, message: validation.message };

            // Update local available coupons list if needed
            setAvailableCoupons(prev => {
                const exists = prev.find(c => c.code === validation.mappedCoupon.code);
                return exists
                    ? prev.map(c => c.code === validation.mappedCoupon.code ? validation.mappedCoupon : c)
                    : [...prev, validation.mappedCoupon];
            });

            dispatch({
                type: "APPLY_COUPON",
                payload: { code: validation.mappedCoupon.code, coupon: validation.mappedCoupon }
            });

            return { success: true, message: "Coupon Applied!" };
        } catch (err) {
            console.error("Coupon error:", err);
            return { success: false, message: "Validation error" };
        }
    };

    const removeCoupon = () => dispatch({ type: "REMOVE_COUPON" });
    const getCampusSlots = (campusId) => Pricing.getCampusSlots(orderSettings, campusId);


    return (
        <CartContext.Provider
            value={{
                // State
                cartItems: state.cartItems,
                isCartOpen: state.isCartOpen,
                userDetails: state.userDetails,
                couponCode: state.couponCode,
                activeCoupon: state.activeCoupon,

                // Data
                availableCoupons,
                orderSettings,
                grocerySettings,
                laundrySettings,
                campusConfig: orderSettings?.deliveryCampusConfig || [],

                // Metrics
                itemTotal,
                totalItems,
                deliveryCharge: deliveryMetrics.deliveryCharge,
                campusDeliveryCharge: deliveryMetrics.campusDeliveryCharge,
                hasHeavyItems: deliveryMetrics.hasHeavyItems,
                isMultiRestaurant: deliveryMetrics.isMultiRestaurant,
                discount,
                finalTotal,
                minOrderShortfalls,

                // Actions
                setIsCartOpen,
                setUserDetails,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                applyCoupon,
                removeCoupon,
                getCampusSlots,

                // Constants/Config (Passthrough)
                paymentQR: orderSettings?.paymentQR,
                foodDeliveryNumber: orderSettings?.whatsappNumber || "919048086503",
                laundryNumber: orderSettings?.laundryWhatsappNumber || "919048086503",
                groceryNumber: grocerySettings?.whatsappNumber || "919048086503",
                upiId: orderSettings?.upiId || "",
                googleSheetUrl: orderSettings?.googleSheetUrl || "",
                whatsappGroups: orderSettings?.whatsappGroups || [],
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}
