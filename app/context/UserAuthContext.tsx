"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { FirebaseError } from "firebase/app";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

export interface AuthResult {
    success: boolean;
    error?: string;
}

export interface UserAuthContextValue {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<AuthResult>;
    register: (email: string, password: string) => Promise<AuthResult>;
    loginWithGoogle: () => Promise<AuthResult>;
    logout: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextValue | null>(null);

export function UserAuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string): Promise<AuthResult> => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (err) {
            const error = err as FirebaseError;
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

    const register = async (email: string, password: string): Promise<AuthResult> => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            await createUserWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (err) {
            const error = err as FirebaseError;
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

    const loginWithGoogle = async (): Promise<AuthResult> => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithPopup(auth, googleProvider);
            return { success: true };
        } catch (err) {
            const error = err as FirebaseError;
            if (
                error.code === "auth/popup-closed-by-user" ||
                error.code === "auth/cancelled-popup-request"
            ) {
                return { success: false, error: "" };
            }
            console.error("Google sign-in error:", error);
            return { success: false, error: "google-failed" };
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
