"use client";

import Navbar from "../../components/Navbar";
import { motion } from "framer-motion";
import { ArrowLeft, ScrollText, Shirt } from "lucide-react";
import Link from "next/link";

export default function LaundryTermsPage() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-blue-500 selection:text-white pb-20">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8 pt-24 relative z-10">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                    <ArrowLeft size={16} /> Back to Home
                </Link>

                <div className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 text-blue-500 font-bold tracking-widest uppercase text-xs mb-4"
                    >
                        <Shirt size={16} /> Laundry Service
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black tracking-tight mb-4"
                    >
                        Terms & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Conditions</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg"
                    >
                        Coming Soon
                    </motion.p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500">
                        <Shirt size={120} />
                    </div>

                    <p className="text-gray-300 leading-relaxed mb-8 font-medium italic text-center py-20">
                        Detailed Terms & Conditions for the PUMATO Laundry service will be released upon service launch.
                    </p>
                </div>

                <div className="mt-12 text-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} PUMATO. All rights reserved.</p>
                </div>
            </div>
        </main>
    );
}
