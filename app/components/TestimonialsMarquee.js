"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function TestimonialsMarquee({ reviews, dark = true }) {
    // Split reviews into two rows
    const row1 = reviews.slice(0, Math.ceil(reviews.length / 2));
    const row2 = reviews.slice(Math.ceil(reviews.length / 2));

    const MarqueeRow = ({ items, direction = "left", speed = 40 }) => {
        // Duplicate items for seamless loop
        const duplicatedItems = [...items, ...items, ...items];

        return (
            <div className="flex overflow-hidden group py-4">
                <motion.div
                    animate={{
                        x: direction === "left" ? [0, -items.length * 340] : [-items.length * 340, 0],
                    }}
                    transition={{
                        duration: speed,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="flex flex-nowrap gap-6"
                >
                    {duplicatedItems.map((review, i) => (
                        <div
                            key={i}
                            className={`w-[320px] flex-shrink-0 p-6 rounded-3xl border transition-all duration-500 ${dark
                                ? "bg-white/5 backdrop-blur-md border-white/10 hover:border-orange-500/50"
                                : "bg-gray-50 border-gray-100 hover:shadow-xl hover:border-red-500/30"
                                }`}
                        >
                            <div className={`flex items-center gap-1 mb-4 ${dark ? "text-orange-500" : "text-yellow-500"}`}>
                                {[...Array(5)].map((_, i) => (
                                    <Sparkles key={i} size={12} fill="currentColor" />
                                ))}
                            </div>
                            <p className={`${dark ? "text-gray-300" : "text-gray-600"} leading-relaxed mb-6 text-sm italic line-clamp-4`}>
                                "{review.text}"
                            </p>
                            <div className={`flex items-center gap-3 border-t pt-4 ${dark ? "border-white/5" : "border-gray-200"}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${dark ? "bg-gradient-to-br from-orange-500 to-purple-600" : "bg-red-100 text-red-600"
                                    }`}>
                                    {review.name.charAt(0)}
                                </div>
                                <span className={`${dark ? "text-white" : "text-gray-900"} font-bold text-sm tracking-tight`}>
                                    {review.name}
                                </span>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        );
    };

    return (
        <div className="w-full space-y-4 relative">
            {/* Edge Fades */}
            <div className={`absolute left-0 top-0 bottom-0 w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-r ${dark ? 'from-black to-transparent' : 'from-white to-transparent'}`} />
            <div className={`absolute right-0 top-0 bottom-0 w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l ${dark ? 'from-black to-transparent' : 'from-white to-transparent'}`} />

            <MarqueeRow items={row1} direction="left" speed={50} />
            <MarqueeRow items={row2} direction="right" speed={60} />
        </div>
    );
}
