"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { cardClass, inputClass, primaryButton } from "../styles";

/** Sign in or sign up in place, so an existing Pumato account just signs in. */
export default function AuthCard() {
    const { login, register, loginWithGoogle } = useUserAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        const result = isRegister ? await register(email, password) : await login(email, password);
        if (!result.success && result.error) toast.error(result.error);
        setBusy(false);
    };

    const handleGoogle = async () => {
        setBusy(true);
        const result = await loginWithGoogle();
        if (result.error === "google-failed") {
            toast.error("Google sign-in isn't working right now. Please use email instead.");
        }
        setBusy(false);
    };

    return (
        <form onSubmit={handleSubmit} className={cardClass}>
            <p className="text-sm text-gray-400">
                Already use Pumato? Sign in with the same account. Otherwise, create one.
            </p>
            <input
                type="email"
                aria-label="Email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
            />
            <input
                type="password"
                aria-label="Password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                minLength={6}
                required
            />
            <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? (
                    <Loader2 size={20} className="animate-spin" />
                ) : isRegister ? (
                    <UserPlus size={20} />
                ) : (
                    <LogIn size={20} />
                )}
                {isRegister ? "Create account" : "Sign in"}
            </button>
            <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all"
            >
                Continue with Google
            </button>
            <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="w-full text-sm text-gray-400 hover:text-white"
            >
                {isRegister ? "Have an account? Sign in" : "New here? Create an account"}
            </button>
        </form>
    );
}
