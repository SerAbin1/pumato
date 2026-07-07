"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);

    const { user, loading, login, register, loginWithGoogle } = useUserAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            router.push("/");
        }
    }, [loading, user, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const result = isRegister ? await register(email, password) : await login(email, password);

        if (result.success) {
            router.push("/");
        } else {
            setError(result.error);
        }

        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError("");
        setIsLoading(true);
        const result = await loginWithGoogle();
        if (result?.success === false) {
            if (result.error === "google-failed") {
                toast.error(
                    isRegister
                        ? "Google sign-up isn't working right now. Please sign up with email/password instead."
                        : "Google sign-in isn't working right now. Please sign in with email/password instead."
                );
            }
            setIsLoading(false);
        } else if (result?.success === true) {
            router.push("/");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Noise Overlay */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.04] z-[0] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            ></div>

            {/* Background Glows */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-orange-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Back to Home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium mb-8 transition-colors"
                >
                    <ArrowLeft size={16} />
                    Back to Home
                </Link>

                {/* Logo / Title */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl mb-6 shadow-2xl shadow-orange-900/40 overflow-hidden"
                    >
                        <Image
                            src="/logo.png"
                            alt="Pumato"
                            width={48}
                            height={48}
                            className="w-12 h-12 object-contain"
                            priority
                            unoptimized
                        />
                    </motion.div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        {isRegister ? "Create Account" : "Welcome Back"}
                    </h1>
                    <p className="text-gray-400 font-medium">
                        {isRegister ? "Sign up to start ordering" : "Sign in to your account"}
                    </p>
                </div>

                {/* Login Form */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl"
                >
                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400"
                        >
                            <AlertCircle size={20} className="flex-shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </motion.div>
                    )}

                    {/* Email Field */}
                    <div className="mb-5">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail
                                size={20}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                            />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 pl-12 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium placeholder-gray-600"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="mb-8">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
                            Password
                        </label>
                        <div className="relative">
                            <Lock
                                size={20}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                            />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 pl-12 pr-12 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium placeholder-gray-600"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-xl font-bold shadow-xl shadow-orange-900/40 hover:from-orange-500 hover:to-red-500 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {isRegister ? "Creating Account..." : "Signing in..."}
                            </>
                        ) : (
                            <>
                                {isRegister ? <UserPlus size={20} /> : <LogIn size={20} />}
                                {isRegister ? "Create Account" : "Sign In"}
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                            or
                        </span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    {/* Google Sign-In */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full bg-white/5 border border-white/10 text-white p-4 rounded-xl font-bold hover:bg-white/10 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        {isRegister ? "Sign up with Google" : "Sign in with Google"}
                    </button>
                </form>

                {/* Toggle Login/Register */}
                <p className="text-center text-gray-400 text-sm mt-8">
                    {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError("");
                        }}
                        className="text-orange-400 hover:text-orange-300 font-bold transition-colors"
                    >
                        {isRegister ? "Sign In" : "Sign Up"}
                    </button>
                </p>
            </motion.div>
        </div>
    );
}
