"use client";

import Link from "next/link";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import CartDrawer from "./CartDrawer";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
    const { setIsCartOpen, totalItems, orderSettings, grocerySettings } = useCart();
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 50);
    });

    const format12h = (time24) => {
        if (!time24) return "";
        const [h, m] = time24.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
    };

    // Determine which settings to use based on path
    const isGroceryPage = pathname?.startsWith("/grocery");
    const currentSettings = isGroceryPage ? grocerySettings : orderSettings;
    const settingsLabel = isGroceryPage ? "Grocery Hours" : "Food Ordering Hours";

    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        const checkLive = () => {
            const now = new Date();
            const timeInMinutes = now.getHours() * 60 + now.getMinutes();
            const slots = currentSettings?.slots || [];
            const active = slots.some(slot => {
                const [startH, startM] = (slot.start || "00:00").split(":").map(Number);
                const [endH, endM] = (slot.end || "23:59").split(":").map(Number);
                return timeInMinutes >= (startH * 60 + startM) && timeInMinutes <= (endH * 60 + endM);
            });
            setIsLive(active);
        };

        checkLive();
        const interval = setInterval(checkLive, 60000);
        return () => clearInterval(interval);
    }, [currentSettings]);

    const navClass = isScrolled
        ? "bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-lg"
        : "bg-transparent border-transparent";

    const LiveIndicator = () => {
        const popoverRef = useRef(null);

        useEffect(() => {
            const handleClickOutside = (event) => {
                if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                    setIsScheduleOpen(false);
                }
            };
            if (isScheduleOpen) {
                document.addEventListener("mousedown", handleClickOutside);
            }
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, [isScheduleOpen]);

        return (
            <div className="relative" ref={popoverRef}>
                <button
                    onClick={() => setIsScheduleOpen(!isScheduleOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${isLive ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20' : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'}`}
                >
                    <div className="relative flex h-2 w-2">
                        {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isLive ? 'text-green-500' : 'text-red-500'}`}>
                        {isLive ? 'Live' : 'Offline'}
                    </span>
                </button>

                <AnimatePresence>
                    {isScheduleOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 md:left-auto md:right-0 top-full mt-3 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl z-[60]"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">{settingsLabel}</h4>
                                <button onClick={() => setIsScheduleOpen(false)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                            </div>
                            <div className="space-y-3">
                                {currentSettings?.slots?.length > 0 ? (
                                    currentSettings.slots.map((slot, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Slot {i + 1}</span>
                                            <span className="text-xs font-black text-white">{format12h(slot.start)} - {format12h(slot.end)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-gray-500 italic text-center py-2">No ordering hours scheduled for today.</p>
                                )}
                            </div>
                            <div className={`mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2 ${isLive ? 'text-green-500' : 'text-red-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Currently {isLive ? 'Open' : 'Closed'}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <>
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 text-white ${navClass}`}
            >
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2 group">
                            <Image
                                src="/logo.png"
                                alt="Pumato Logo"
                                width={48}
                                height={48}
                                className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                                priority
                            />
                        </Link>
                        {/* Mobile Live Indicator */}
                        <div className="md:hidden">
                            <LiveIndicator />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-8">
                        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-300">
                            <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            <Link href="/delivery" className={`hover:text-white transition-colors ${pathname === '/delivery' ? 'text-white font-bold' : ''}`}>Food</Link>
                            <Link href="/laundry" className={`hover:text-white transition-colors ${pathname === '/laundry' ? 'text-white font-bold' : ''}`}>Laundry</Link>
                            <Link href="/grocery" className={`hover:text-white transition-colors ${pathname === '/grocery' ? 'text-white font-bold' : ''}`}>Grocery</Link>
                            <LiveIndicator />
                        </div>

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 rounded-full hover:bg-white/10 transition-colors group"
                        >
                            <ShoppingBag size={24} className="text-gray-200 group-hover:text-white transition-colors" />
                            {totalItems > 0 && (
                                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-black transform scale-100 group-hover:scale-110 transition-transform">
                                    {totalItems}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </motion.nav>
            <CartDrawer />
        </>
    );
}
