"use client";

import { createContext, useContext, useMemo, useReducer } from "react";

import { supabase } from "@/lib/supabase";
import { useCustomerProfile } from "@/app/context/CustomerContext";
import { useFoodOrderSettings } from "@/app/context/ServiceSettingsContext";
import { cartReducer, initialState } from "@/app/context/cartReducer";
import { useCoupons, useRestaurants } from "@/app/food/hooks/useFoodData";
import * as Pricing from "@/app/food/lib/pricing";

const FoodCartContext = createContext(null);

export function FoodCartProvider({ children }) {
    const [state, dispatch] = useReducer(cartReducer, initialState);
    const { userDetails, setUserDetails, isLoaded } = useCustomerProfile();

    const { restaurants } = useRestaurants();
    const { availableCoupons, setAvailableCoupons } = useCoupons();
    const { orderSettings } = useFoodOrderSettings();

    const itemTotal = useMemo(() => Pricing.calculateItemTotal(state.cartItems), [state.cartItems]);
    const totalItems = useMemo(() => Pricing.calculateTotalItems(state.cartItems), [state.cartItems]);
    const currentRestaurant = useMemo(
        () => Pricing.getCurrentRestaurant(state.cartItems, restaurants),
        [state.cartItems, restaurants]
    );
    const deliveryMetrics = useMemo(
        () => Pricing.calculateDeliveryCharge(state.cartItems, orderSettings, currentRestaurant, userDetails),
        [state.cartItems, orderSettings, currentRestaurant, userDetails]
    );
    const discount = useMemo(
        () => Pricing.calculateDiscount(state.activeCoupon, state.cartItems, itemTotal),
        [state.activeCoupon, state.cartItems, itemTotal]
    );
    const minOrderShortfalls = useMemo(
        () => Pricing.calculateMinOrderShortfalls(state.cartItems, restaurants),
        [state.cartItems, restaurants]
    );
    const finalTotal = Math.max(0, itemTotal + deliveryMetrics.deliveryCharge - discount);

    const addToCart = (item, quantityDelta = 1) => dispatch({ type: "ADD_ITEM", payload: { item, quantityDelta } });
    const removeFromCart = (id) => dispatch({ type: "REMOVE_ITEM", payload: id });
    const updateQuantity = (id, delta) => dispatch({ type: "UPDATE_QUANTITY", payload: { id, delta } });
    const clearCart = () => dispatch({ type: "CLEAR_CART" });
    const setIsCartOpen = (isOpen) => dispatch({ type: "SET_CART_OPEN", payload: isOpen });

    const applyCoupon = async (code) => {
        const uppercaseCode = code.trim().toUpperCase();

        try {
            const { data: coupon, error } = await supabase.functions.invoke("manage-coupons", {
                body: { action: "FETCH_BY_CODE", payload: { code: uppercaseCode } }
            });

            if (error || !coupon) return { success: false, message: "Invalid Coupon Code" };

            const validation = Pricing.validateCoupon(coupon, itemTotal);
            if (!validation.success) return { success: false, message: validation.message };

            setAvailableCoupons((prev) => {
                const exists = prev.find((candidate) => candidate.code === validation.mappedCoupon.code);
                return exists
                    ? prev.map((candidate) => (
                        candidate.code === validation.mappedCoupon.code ? validation.mappedCoupon : candidate
                    ))
                    : [...prev, validation.mappedCoupon];
            });

            dispatch({
                type: "APPLY_COUPON",
                payload: { code: validation.mappedCoupon.code, coupon: validation.mappedCoupon }
            });

            return { success: true, message: "Coupon Applied!" };
        } catch (error) {
            console.error("Coupon error:", error);
            return { success: false, message: "Validation error" };
        }
    };

    const removeCoupon = () => dispatch({ type: "REMOVE_COUPON" });

    return (
        <FoodCartContext.Provider
            value={{
                cartItems: state.cartItems,
                isCartOpen: state.isCartOpen,
                couponCode: state.couponCode,
                activeCoupon: state.activeCoupon,
                userDetails,
                setUserDetails,
                isLoaded,
                availableCoupons,
                orderSettings,
                campusConfig: orderSettings?.deliveryCampusConfig || [],
                itemTotal,
                totalItems,
                deliveryCharge: deliveryMetrics.deliveryCharge,
                campusDeliveryCharge: deliveryMetrics.campusDeliveryCharge,
                hasHeavyItems: deliveryMetrics.hasHeavyItems,
                isMultiRestaurant: deliveryMetrics.isMultiRestaurant,
                discount,
                finalTotal,
                minOrderShortfalls,
                setIsCartOpen,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                applyCoupon,
                removeCoupon,
                paymentQR: orderSettings?.paymentQR,
                foodDeliveryNumber: orderSettings?.whatsappNumber || "919048086503",
                upiId: orderSettings?.upiId || "",
                googleSheetUrl: orderSettings?.googleSheetUrl || "",
            }}
        >
            {children}
        </FoodCartContext.Provider>
    );
}

export function useFoodCart() {
    const context = useContext(FoodCartContext);

    if (!context) {
        throw new Error("useFoodCart must be used within a FoodCartProvider");
    }

    return context;
}
