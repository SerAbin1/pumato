"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
} from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

const UserAuthContext = createContext(null);

export function UserAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        // Handle Google redirect result on mount
        getRedirectResult(auth)
            .then((result) => {
                if (result) {
                    const credential = GoogleAuthProvider.credentialFromResult(result);
                    if (credential) {
                        // Google access token available if needed: credential.accessToken
                    }
                }
            })
            .catch((error) => {
                console.error("Google redirect error:", error.code, error.message);
            });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            let message = "Login failed. Please try again.";

            if (
                error.code === "auth/user-not-found" ||
                error.code === "auth/wrong-password" ||
                error.code === "auth/invalid-credential"
            ) {
                message = "Invalid email or password.";
            } else if (error.code === "auth/too-many-requests") {
                message = "Too many failed attempts. Please try again later.";
            } else if (error.code === "auth/user-disabled") {
                message = "This account has been disabled.";
            }

            return { success: false, error: message };
        }
    };

    const register = async (email, password) => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            await createUserWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            let message = "Registration failed. Please try again.";

            if (error.code === "auth/email-already-in-use") {
                message = "An account with this email already exists.";
            } else if (error.code === "auth/weak-password") {
                message = "Password should be at least 6 characters.";
            } else if (error.code === "auth/invalid-email") {
                message = "Please enter a valid email address.";
            }

            return { success: false, error: message };
        }
    };

    const loginWithGoogle = async () => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            console.error("Google sign-in error:", error);
            return { success: false, error: "Google sign-in failed. Please try again." };
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
        <UserAuthContext.Provider
            value={{ user, loading, login, register, loginWithGoogle, logout }}
        >
            {children}
        </UserAuthContext.Provider>
    );
}

export function useUserAuth() {
    const context = useContext(UserAuthContext);
    if (!context) {
        throw new Error("useUserAuth must be used within a UserAuthProvider");
    }
    return context;
}
