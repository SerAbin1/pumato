"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "pumato_user_details";

const DEFAULT_USER_DETAILS = {
    name: "",
    phone: "",
    campus: "",
    address: "",
    instructions: ""
};

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
    const [userDetails, setUserDetailsState] = useState(DEFAULT_USER_DETAILS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved) {
                try {
                    setUserDetailsState((prev) => ({ ...prev, ...JSON.parse(saved) }));
                } catch (error) {
                    console.error("Failed to parse saved user details", error);
                }
            }

            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userDetails));
        }
    }, [isLoaded, userDetails]);

    const setUserDetails = useCallback((details) => {
        setUserDetailsState((prev) => (
            typeof details === "function"
                ? details(prev)
                : details
        ));
    }, []);

    return (
        <CustomerContext.Provider value={{ userDetails, setUserDetails, isLoaded }}>
            {children}
        </CustomerContext.Provider>
    );
}

export function useCustomerProfile() {
    const context = useContext(CustomerContext);

    if (!context) {
        throw new Error("useCustomerProfile must be used within a CustomerProvider");
    }

    return context;
}
