"use client";

import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWhatsNew } from "../hooks/useWhatsNew";

export default function WhatsNewBell() {
    const { announcement, hasUnseen, markSeen } = useWhatsNew();
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (!announcement) return null;

    const handleToggle = () => {
        setIsOpen((prev) => !prev);
        if (hasUnseen) markSeen();
    };

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={handleToggle}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors group"
                aria-label="What's new"
            >
                <Bell
                    size={20}
                    className="text-gray-200 group-hover:text-white transition-colors"
                />
                {hasUnseen && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-3 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl z-[60]"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                What&apos;s New
                            </h4>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="space-y-1">
                            <h5 className="text-sm font-bold text-white">{announcement.title}</h5>
                            <p className="text-xs text-gray-400">{announcement.body}</p>
                        </div>

                        {announcement.href && (
                            <Link
                                href={announcement.href}
                                onClick={() => setIsOpen(false)}
                                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-orange-500 hover:text-orange-400 transition-colors"
                            >
                                Check it out &rarr;
                            </Link>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
