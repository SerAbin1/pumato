"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Get the ID token result to check custom claims
                const tokenResult = await firebaseUser.getIdTokenResult();
                const adminClaim = tokenResult.claims.admin === true;
                const restaurantIdClaim = tokenResult.claims.restaurantId || null;

                setUser(firebaseUser);
                setIsAdmin(adminClaim);
                // We'll attach the restaurantId to the user object or a separate state if preferred.
                // For simplicity, let's attach to the user object wrapper or just state.
                // Actually, let's expose it as a separate state.
                firebaseUser.restaurantId = restaurantIdClaim;
            } else {
                setUser(null);
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const tokenResult = await userCredential.user.getIdTokenResult();

            const isAdmin = tokenResult.claims.admin === true;
            const isPartner = !!tokenResult.claims.restaurantId;

            if (!isAdmin && !isPartner) {
                // User is not authorized at all
                await signOut(auth);
                throw new Error("You are not authorized to access this panel.");
            }

            return { success: true };
        } catch (error) {
            let message = "Login failed. Please try again.";

            if (error.message === "You are not authorized to access this panel.") {
                message = error.message;
            } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                message = "Invalid email or password.";
            } else if (error.code === "auth/too-many-requests") {
                message = "Too many failed attempts. Please try again later.";
            }

            return { success: false, error: message };
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <AdminAuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error("useAdminAuth must be used within an AdminAuthProvider");
    }
    return context;
}
