"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";

const ServiceSettingsContext = createContext(null);

export function ServiceSettingsProvider({ children }) {
    const [orderSettings, setOrderSettings] = useState({});
    const [grocerySettings, setGrocerySettings] = useState({});
    const [laundrySettings, setLaundrySettings] = useState({ slots: [] });

    useEffect(() => {
        const unsubscribes = [
            onSnapshot(doc(db, "site_content", "order_settings"), (settingsDoc) => {
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    setOrderSettings({
                        ...data,
                        deliveryCampusConfig: data.deliveryCampusConfig || [],
                    });
                }
            }),
            onSnapshot(doc(db, "site_content", "grocery_settings"), (settingsDoc) => {
                if (settingsDoc.exists()) {
                    setGrocerySettings(settingsDoc.data());
                }
            }),
            onSnapshot(doc(db, "laundry_slots", "default"), (settingsDoc) => {
                if (settingsDoc.exists()) {
                    setLaundrySettings(settingsDoc.data());
                }
            })
        ];

        return () => {
            unsubscribes.forEach((unsubscribe) => unsubscribe());
        };
    }, []);

    const value = useMemo(() => ({
        orderSettings,
        grocerySettings,
        laundrySettings
    }), [grocerySettings, laundrySettings, orderSettings]);

    return (
        <ServiceSettingsContext.Provider value={value}>
            {children}
        </ServiceSettingsContext.Provider>
    );
}

function useServiceSettingsContext() {
    const context = useContext(ServiceSettingsContext);

    if (!context) {
        throw new Error("Service settings hooks must be used within a ServiceSettingsProvider");
    }

    return context;
}

export function useFoodOrderSettings() {
    const { orderSettings } = useServiceSettingsContext();
    return { orderSettings };
}

export function useGrocerySettings() {
    const { grocerySettings } = useServiceSettingsContext();
    return { grocerySettings };
}

export function useLaundrySettings() {
    const { laundrySettings } = useServiceSettingsContext();
    return { laundrySettings };
}
