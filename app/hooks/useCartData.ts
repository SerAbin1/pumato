import { db } from "@/lib/firebase";
import { collection, getDocs, doc, onSnapshot } from "firebase/firestore";
import { manageCoupons } from "@/lib/functions";
import { COLLECTIONS, SITE_CONTENT_DOCS } from "@/lib/constants";
import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Coupon, GrocerySettings, OrderSettings, Restaurant } from "@/lib/types";

export function useRestaurants() {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, COLLECTIONS.RESTAURANTS));
                const data = querySnapshot.docs.map(
                    (doc) => ({ ...doc.data(), id: doc.id }) as Restaurant
                );
                setRestaurants(data);
            } catch (err) {
                console.error("Failed to fetch restaurants", err);
            } finally {
                setLoaded(true);
            }
        };
        fetchRestaurants();
    }, []);

    return { restaurants, loaded };
}

export function useCoupons(): {
    availableCoupons: Coupon[];
    setAvailableCoupons: Dispatch<SetStateAction<Coupon[]>>;
} {
    const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

    useEffect(() => {
        const fetchCoupons = async () => {
            try {
                const { data } = await manageCoupons<Coupon[] | null>({ action: "FETCH_VISIBLE" });

                // Map to camelCase for frontend consistency
                const mapped = (data || []).map((c) => ({
                    ...c,
                    minOrder: c.min_order,
                    isVisible: c.is_visible,
                    usageLimit: c.usage_limit,
                    usedCount: c.used_count,
                    restaurantId: c.restaurant_id,
                    itemId: c.item_id,
                }));
                setAvailableCoupons(mapped);
            } catch (err) {
                console.error("Failed to fetch coupons", err);
            }
        };

        fetchCoupons();
    }, []);

    return { availableCoupons, setAvailableCoupons };
}

export function useOrderSettings() {
    const [orderSettings, setOrderSettings] = useState<OrderSettings>({});

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.ORDER_SETTINGS),
            (settingsDoc) => {
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data() as OrderSettings;
                    setOrderSettings({
                        ...data,
                        deliveryCampusConfig: data.deliveryCampusConfig || [],
                    });
                }
            }
        );
        return () => unsubscribe();
    }, []);

    return { orderSettings };
}

export function useGrocerySettings() {
    const [grocerySettings, setGrocerySettings] = useState<GrocerySettings>({});

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.GROCERY_SETTINGS),
            (settingsDoc) => {
                if (settingsDoc.exists()) {
                    setGrocerySettings(settingsDoc.data() as GrocerySettings);
                }
            }
        );
        return () => unsubscribe();
    }, []);

    return { grocerySettings };
}

export function useLaundrySettings() {
    const [laundrySettings, setLaundrySettings] = useState<{ slots: string[] }>({
        slots: [],
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, COLLECTIONS.LAUNDRY_SLOTS, "default"),
            (settingsDoc) => {
                if (settingsDoc.exists()) {
                    setLaundrySettings(settingsDoc.data() as { slots: string[] });
                }
            }
        );
        return () => unsubscribe();
    }, []);

    return { laundrySettings };
}
