"use client";

import Link from "next/link";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import CartDrawer from "./CartDrawer";
import { usePathname } from "next/navigation";
import Image from "next/image";

const format12h = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const LiveIndicator = ({ isLive, settings, label }) => {
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

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
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
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 md:left-auto md:right-0 top-full mt-3 w-64 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl z-[60]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</h4>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="space-y-3">
                            {settings?.slots?.length > 0 ? (
                                settings.slots.map((slot, i) => (
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

const CommunityDropdown = ({ groups }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    if (!groups || groups.length === 0) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border bg-green-500/10 border-green-500/20 hover:bg-green-500/20 text-green-500"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">Community</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 md:left-auto md:right-0 top-full mt-3 w-56 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-[60]"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Join our Groups</h4>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="space-y-2">
                            {groups.map((group, i) => (
                                <a
                                    key={i}
                                    href={group.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-white/5 hover:bg-green-500/10 px-3 py-2.5 rounded-xl border border-white/5 hover:border-green-500/20 transition-all group"
                                >
                                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold text-white group-hover:text-green-400 transition-colors">{group.name}</span>
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function Navbar() {
    const { setIsCartOpen, totalItems, orderSettings, grocerySettings, whatsappGroups } = useCart();
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 50);
    });

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
                        {/* Mobile Live Indicator & Community */}
                        <div className="md:hidden flex items-center gap-2">
                            <CommunityDropdown groups={whatsappGroups} />
                            <LiveIndicator isLive={isLive} settings={currentSettings} label={settingsLabel} />
                        </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-8">
                        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-300">
                            <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            <Link href="/delivery" className={`hover:text-white transition-colors ${pathname === '/delivery' ? 'text-white font-bold' : ''}`}>Food</Link>
                            <Link href="/laundry" className={`hover:text-white transition-colors ${pathname === '/laundry' ? 'text-white font-bold' : ''}`}>Laundry</Link>
                            <Link href="/grocery" className={`hover:text-white transition-colors ${pathname === '/grocery' ? 'text-white font-bold' : ''}`}>Grocery</Link>
                            <CommunityDropdown groups={whatsappGroups} />
                            <LiveIndicator isLive={isLive} settings={currentSettings} label={settingsLabel} />
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
