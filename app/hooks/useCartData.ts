import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/constants";
import { useState, useEffect } from "react";
import {
    subscribeGrocerySettings,
    subscribeLaundrySlots,
    subscribeOrderSettings,
} from "@/lib/repositories";
import type { GrocerySettings, OrderSettings, Restaurant } from "@/lib/types";

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
        void fetchRestaurants();
    }, []);

    return { restaurants, loaded };
}

export function useOrderSettings() {
    const [orderSettings, setOrderSettings] = useState<OrderSettings>({});

    useEffect(() => subscribeOrderSettings(setOrderSettings), []);

    return { orderSettings };
}

export function useGrocerySettings() {
    const [grocerySettings, setGrocerySettings] = useState<GrocerySettings>({});

    useEffect(() => subscribeGrocerySettings(setGrocerySettings), []);

    return { grocerySettings };
}

export function useLaundrySettings() {
    const [laundrySettings, setLaundrySettings] = useState<{ slots: string[] }>({
        slots: [],
    });

    useEffect(() => subscribeLaundrySlots("default", setLaundrySettings), []);

    return { laundrySettings };
}
