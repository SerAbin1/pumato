"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { motion } from "framer-motion";
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";

export default function PartnerLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { login, user, loading } = useAdminAuth();
    const router = useRouter();

    // If already logged in, redirect to partner dashboard
    if (!loading && user) {
        router.push("/partner");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        const result = await login(email, password);

        if (result.success) {
            router.push("/partner");
        } else {
            setError(result.error);
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
            {/* Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* Background Glows (Different colors for partner) */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo / Title */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl shadow-blue-900/40"
                    >
                        <Lock size={36} className="text-white" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Partner Login</h1>
                    <p className="text-gray-400 font-medium">Manage your restaurant details</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl">
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
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 pl-12 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder-gray-600"
                                placeholder="partner@example.com"
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
                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text" // Changed to text temporarily to debug showPassword logic if needed, but actually standard is generic input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 pl-12 pr-12 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder-gray-600"
                                placeholder="••••••••"
                                required
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
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl font-bold shadow-xl shadow-blue-900/40 hover:from-blue-500 hover:to-purple-500 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                <LogIn size={20} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p className="text-center text-gray-600 text-sm mt-8">
                    Partner Access Portal
                </p>
            </motion.div>
        </div>
    );
}
