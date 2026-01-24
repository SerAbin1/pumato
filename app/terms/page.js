"use client";

import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import { ArrowLeft, ScrollText, Utensils, ShoppingBasket, Shirt, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function TermsHubPage() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-orange-500 selection:text-white pb-20">
            {/* Noise Overlay */}
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
                        className="inline-flex items-center gap-2 text-orange-500 font-bold tracking-widest uppercase text-xs mb-4"
                    >
                        <ScrollText size={16} /> Legal
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black tracking-tight mb-4"
                    >
                        Terms & <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">Conditions</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg"
                    >
                        Please select a service to view its specific terms.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <TermsLink
                        href="/terms/delivery"
                        title="Food Delivery"
                        icon={<Utensils size={32} />}
                        description="Terms for ordering food from partner restaurants through PUMATO."
                        color="orange"
                    />
                    <TermsLink
                        href="/terms/grocery"
                        title="Grocery Delivery"
                        icon={<ShoppingBasket size={32} />}
                        description="Terms for our personal shopping and grocery courier service."
                        color="green"
                    />
                    <TermsLink
                        href="/terms/laundry"
                        title="Laundry Service"
                        icon={<Shirt size={32} />}
                        description="Terms for campus pickup and delivery laundry services."
                        color="blue"
                    />
                </div>

                <div className="mt-20 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <ScrollText size={20} className="text-orange-500" />
                        Common Provisions
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        By using any PUMATO service, you agree to treat our student delivery partners with respect. Any form of harassment or abuse will result in immediate suspension. PUMATO operates strictly as an intermediary facilitator and is not responsible for manufacturing defects or vendor-side quality issues.
                    </p>
                </div>

                <div className="mt-12 text-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} PUMATO. All rights reserved.</p>
                </div>
            </div>
        </main>
    );
}

function TermsLink({ href, title, icon, description, color }) {
    const colorClasses = {
        orange: "text-orange-500 border-orange-500/10 hover:border-orange-500/50 bg-orange-500/5",
        green: "text-green-500 border-green-500/10 hover:border-green-500/50 bg-green-500/5",
        blue: "text-blue-500 border-blue-500/10 hover:border-blue-500/50 bg-blue-500/5"
    };

    return (
        <Link href={href} className={`block p-8 rounded-3xl border transition-all group ${colorClasses[color]}`}>
            <div className="mb-4">{icon}</div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{description}</p>
            <div className="flex items-center gap-2 font-bold text-sm group-hover:gap-4 transition-all">
                Read Full Terms <ArrowRight size={16} />
            </div>
        </Link>
    );
}
