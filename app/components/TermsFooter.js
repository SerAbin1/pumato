"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ScrollText, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function TermsFooter({ type = "delivery" }) {
    const isGrocery = type === "grocery";

    const terms = isGrocery ? [
        "PUMATO is a student-run personal shopping facilitator, not a store",
        "Item quality, pricing, and availability are determined by third-party stores",
        "Total payable = Store Bill + Delivery Fee (varies by complexity)",
        "Prohibited items (tobacco, alcohol) result in immediate ban",
        "Orders once purchased cannot be cancelled"
    ] : [
        "PUMATO is a student-run food delivery facilitator, not a restaurant",
        "Food quality, pricing, parcel charges, and preparation are handled by restaurants",
        "Delivery fees may vary based on time, distance, weather, or complexity",
        "Item images are illustrative and may differ from actual delivered food",
        "Promo codes are first-come, first-served; misuse leads to suspension",
        "Orders once prepared cannot be cancelled"
    ];

    const termsLink = isGrocery ? "/terms/grocery" : "/terms/delivery";

    return (
        <footer className="mt-20 border-t border-white/5 bg-black/20 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="py-12 grid md:grid-cols-2 gap-12 border-b border-white/5">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck size={14} className={isGrocery ? 'text-green-500/50' : 'text-orange-500/50'} />
                            <h2 className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                                Key Terms Summary
                            </h2>
                        </div>
                        <ul className="grid sm:grid-cols-1 gap-2">
                            {terms.map((term, i) => (
                                <li key={i} className="flex items-start gap-2 text-gray-500 text-[10px] leading-relaxed">
                                    <span className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${isGrocery ? 'bg-green-500/30' : 'bg-orange-500/30'}`} />
                                    {term}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="md:text-right flex flex-col md:items-end justify-center">
                        <p className="text-gray-500 text-[10px] mb-2">
                            For the full legal documentation, please visit our terms page.
                        </p>
                        <Link
                            href={termsLink}
                            className={`inline-flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider ${isGrocery ? 'text-green-500/60 hover:text-green-400' : 'text-orange-500/60 hover:text-orange-400'} transition-colors`}
                        >
                            Read Full T&C <ArrowRight size={12} />
                        </Link>
                    </div>
                </div>

                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">
                            PUMATO – A Student-Run Initiative
                        </p>
                    </div>
                    <div className="flex gap-8">
                        <Link href="/terms" className="text-[10px] font-medium text-gray-600 hover:text-white transition-colors">Common Terms</Link>
                        <Link href="https://wa.me/919048086503" className="text-[10px] font-medium text-gray-600 hover:text-white transition-colors">Support</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
