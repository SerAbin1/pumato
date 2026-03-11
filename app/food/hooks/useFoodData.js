import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

export function useRestaurants() {
    const [restaurants, setRestaurants] = useState([]);

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "restaurants"));
                const data = querySnapshot.docs.map((snapshot) => ({ ...snapshot.data(), id: snapshot.id }));
                setRestaurants(data);
            } catch (error) {
                console.error("Failed to fetch restaurants", error);
            }
        };

        fetchRestaurants();
    }, []);

    return { restaurants };
}

export function useCoupons() {
    const [availableCoupons, setAvailableCoupons] = useState([]);

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const { data, error } = await supabase.functions.invoke("manage-coupons", {
                    body: { action: "FETCH_VISIBLE" }
                });

                if (error) throw error;

                const mappedCoupons = (data || []).map((coupon) => ({
                    ...coupon,
                    minOrder: coupon.min_order,
                    isVisible: coupon.is_visible,
                    usageLimit: coupon.usage_limit,
                    usedCount: coupon.used_count,
                    restaurantId: coupon.restaurant_id,
                    itemId: coupon.item_id
                }));

                setAvailableCoupons(mappedCoupons);
            } catch (error) {
                console.error("Failed to fetch coupons from Supabase", error);
            }
        };

        fetchCoupons();
    }, []);

    return { availableCoupons, setAvailableCoupons };
}
