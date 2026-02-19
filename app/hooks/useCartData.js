import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

export function useRestaurants() {
    const [restaurants, setRestaurants] = useState([]);

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "restaurants"));
                const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setRestaurants(data);
            } catch (err) {
                console.error("Failed to fetch restaurants", err);
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

        fetchCoupons();
    }, []);

    return { availableCoupons, setAvailableCoupons };
}

export function useOrderSettings() {
    const [orderSettings, setOrderSettings] = useState({
        slots: [{ start: "18:30", end: "23:00" }]
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "site_content", "order_settings"), (settingsDoc) => {
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                setOrderSettings({
                    ...data,
                    deliveryCampusConfig: data.deliveryCampusConfig || [],
                    // Main slots for backward compatibility
                    slots: data.slots || (data.startTime ? [{ start: data.startTime, end: data.endTime }] : [])
                });
            }
        });
        return () => unsubscribe();
    }, []);

    return { orderSettings };
}

export function useGrocerySettings() {
    const [grocerySettings, setGrocerySettings] = useState({
        slots: [{ start: "10:00", end: "22:00" }]
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "site_content", "grocery_settings"), (settingsDoc) => {
            if (settingsDoc.exists()) {
                setGrocerySettings(settingsDoc.data());
            }
        });
        return () => unsubscribe();
    }, []);

    return { grocerySettings };
}

export function useLaundrySettings() {
    const [laundrySettings, setLaundrySettings] = useState({
        slots: []
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, "laundry_slots", "default"), (settingsDoc) => {
            if (settingsDoc.exists()) {
                setLaundrySettings(settingsDoc.data());
            }
        });
        return () => unsubscribe();
    }, []);

    return { laundrySettings };
}
