"use client";

import Link from "next/link";
import { ShoppingBag, X, LogIn, LogOut, Package, Heart } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useUserAuth } from "../context/UserAuthContext";
import { useRestaurants } from "../hooks/useCartData";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useMemo } from "react";
import CartDrawer from "./CartDrawer";
import WhatsNewBell from "./WhatsNewBell";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { getISTTime } from "@/lib/dateUtils";
import { isServiceLive } from "@/lib/serviceStatus";
import { hasAnyFoodPreOrderAvailable } from "@/lib/preOrderSlots";
import CampusSelector from "./CampusSelector";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

import { format12h } from "@/lib/formatters";

const toMinutes = (hhmm) => {
    const [h, m] = (hhmm || "00:00").split(":").map(Number);
    return h * 60 + m;
};

// Returns the "order by" time (e.g. "7:00 PM") for a pre-order slot's cutoff,
// or "" when there is no cutoff (orders accepted right up to slot start).
const getCutoffDisplay = (start, cutoffMinutes) => {
    const cutoff = Number(cutoffMinutes) || 0;
    if (cutoff <= 0 || !start) return "";
    const total = (toMinutes(start) - cutoff + 1440) % 1440;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return format12h(`${hh}:${mm}`);
};

const LiveIndicator = ({
    isLive,
    settings,
    label,
    hasPreOrder = false,
    preOrderRestaurantNames = [],
}) => {
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

    // "Pre-order" is a distinct third state, not just "Offline" — immediate ordering is closed,
    // but customers can still place a pre-order (campus-wide, or with a restaurant that offers it).
    const status = isLive ? "live" : hasPreOrder ? "preorder" : "offline";
    const statusColor = status === "live" ? "green" : status === "preorder" ? "cyan" : "red";
    const statusText = status === "live" ? "Live" : status === "preorder" ? "Pre-order" : "Offline";

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border bg-${statusColor}-500/10 border-${statusColor}-500/20 hover:bg-${statusColor}-500/20`}
            >
                <div className="relative flex h-2 w-2">
                    {isLive && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    )}
                    <span
                        className={`relative inline-flex rounded-full h-2 w-2 bg-${statusColor}-500`}
                    ></span>
                </div>
                <span
                    className={`text-[10px] font-black uppercase tracking-wider text-${statusColor}-500`}
                >
                    {statusText}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 md:left-auto md:right-0 top-full mt-3 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl z-[60]"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {label}
                            </h4>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {DEFAULT_CAMPUS_CONFIG.map((campus) => {
                                const config = settings?.deliveryCampusConfig || [];
                                const campusData = config.find(
                                    (c) => c.id === campus.id || c.name === campus.name
                                );
                                const slots = campusData?.slots || [];
                                const preOrderSlots = campusData?.isPreOrderEnabled
                                    ? campusData?.preOrderSlots || []
                                    : [];

                                // Build display entries: regular slots as "Slot N" and pre-order slots as "Pre-order Slot N"
                                const allSlots = [
                                    ...slots.map((slot, i) => ({
                                        type: "regular",
                                        label: `Slot ${i + 1}`,
                                        start: slot.start,
                                        end: slot.end,
                                    })),
                                    ...preOrderSlots.map((slot, i) => ({
                                        type: "preOrder",
                                        label: `Pre-order Slot ${i + 1}`,
                                        start: slot.start,
                                        end: slot.end,
                                        cutoffDisplay: getCutoffDisplay(
                                            slot.start,
                                            slot.cutoffMinutes
                                        ),
                                    })),
                                ];

                                return (
                                    <div key={campus.id} className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-black text-white uppercase tracking-wider">
                                                {campus.name}
                                            </span>
                                            <div
                                                className={`w-1.5 h-1.5 rounded-full ${allSlots.length > 0 ? "bg-orange-500" : "bg-zinc-700"}`}
                                            ></div>
                                        </div>
                                        <div className="space-y-1.5">
                                            {allSlots.length > 0 ? (
                                                allSlots.map((s, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-xl border border-white/5"
                                                    >
                                                        <div>
                                                            <span className="text-[9px] font-bold text-gray-500 uppercase">
                                                                {s.label}
                                                            </span>
                                                            {s.type === "preOrder" &&
                                                                s.cutoffDisplay && (
                                                                    <span className="block text-[9px] font-semibold text-cyan-400/80 mt-0.5">
                                                                        Order by {s.cutoffDisplay}
                                                                    </span>
                                                                )}
                                                        </div>
                                                        <span className="text-[10px] font-black text-white">
                                                            {format12h(s.start)} -{" "}
                                                            {format12h(s.end)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="bg-black/20 px-3 py-2 rounded-xl border border-white/5 text-center">
                                                    <span className="text-[9px] text-gray-500 italic">
                                                        No hours set
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {!isLive && preOrderRestaurantNames.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider px-1 block">
                                    Also accepting pre-orders
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {preOrderRestaurantNames.map((name) => (
                                        <span
                                            key={name}
                                            className="text-[9px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full"
                                        >
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div
                            className={`mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-${statusColor}-500`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full bg-${statusColor}-500`}></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                Currently{" "}
                                {isLive ? "Open" : hasPreOrder ? "Pre-order Only" : "Closed"}
                            </span>
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
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-wider hidden md:inline">
                    Community
                </span>
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
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                                Join our Groups
                            </h4>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
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
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="text-green-500"
                                        >
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                    </div>
                                    <span className="text-sm font-bold text-white group-hover:text-green-400 transition-colors">
                                        {group.name}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const UserMenu = ({ user, logout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
            >
                {user?.photoURL ? (
                    <Image
                        src={user.photoURL}
                        alt="Profile"
                        width={24}
                        height={24}
                        className="w-6 h-6 rounded-full object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white text-xs font-bold">
                        {initial}
                    </div>
                )}
                <span className="text-xs font-bold text-white hidden md:inline max-w-[100px] truncate">
                    {displayName}
                </span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-3 w-56 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl z-[60]"
                    >
                        <div className="px-1 pb-3 mb-3 border-b border-white/10">
                            <p className="text-sm font-bold text-white truncate">
                                {user?.displayName || displayName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        </div>
                        <Link
                            href="/orders"
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                        >
                            <Package size={16} />
                            My Orders
                        </Link>
                        <Link
                            href="/favourites"
                            onClick={() => setIsOpen(false)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
                        >
                            <Heart size={16} />
                            Favourites
                        </Link>
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                logout();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function Navbar() {
    const {
        setIsCartOpen,
        totalItems,
        orderSettings,
        grocerySettings,
        laundrySettings,
        whatsappGroups,
        userDetails,
        setUserDetails,
        getCampusSlots,
        getCampusPreOrderConfig,
        isLoaded,
    } = useCart();
    const { restaurants } = useRestaurants();
    const { user: authUser, logout: authLogout, loading: authLoading } = useUserAuth();
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 50);
    });

    // Determine which settings to use based on path
    const isGroceryPage = pathname?.startsWith("/grocery");
    const isLaundryPage = pathname?.startsWith("/laundry");
    const isAdminPage = pathname?.startsWith("/admin");

    let currentSettings = orderSettings;
    let settingsLabel = "Food Ordering Hours";

    if (isGroceryPage) {
        currentSettings = grocerySettings;
        settingsLabel = "Grocery Hours";
    } else if (isLaundryPage) {
        currentSettings = laundrySettings;
        settingsLabel = "Laundry Hours";
    }

    const shouldShowLiveIndicator = !isAdminPage && !isLaundryPage;

    const [isLive, setIsLive] = useState(false);

    // Get slots specific to the user's selected campus
    const currentCampusSlots = getCampusSlots(userDetails.campus);

    // Pre-order availability (food only) — lets a visitor know they can still order even while
    // immediate ordering is closed, whether that's via campus-wide pre-order or a restaurant's own.
    const isFoodContext = currentSettings === orderSettings;
    const campusPreOrderConfig = isFoodContext ? getCampusPreOrderConfig(userDetails.campus) : null;
    const preOrderRestaurantNames = useMemo(() => {
        if (!isFoodContext) return [];
        return restaurants
            .filter((r) => r?.isPreOrderEnabled && r?.preOrderSlots?.length > 0)
            .map((r) => r.name);
    }, [isFoodContext, restaurants]);
    const hasPreOrder =
        isFoodContext && hasAnyFoodPreOrderAvailable(campusPreOrderConfig, restaurants);

    useEffect(() => {
        const checkLive = () => {
            const { timeInMinutes } = getISTTime();

            // Priority: Campus Slots > Global Slots
            // if in food delivery page, use campusSlots else their settings slots
            const slots =
                currentSettings === orderSettings
                    ? currentCampusSlots
                    : (currentSettings?.service_hours ?? []);

            setIsLive(isServiceLive(currentSettings.manualOverride?.status, slots, timeInMinutes));
        };

        checkLive();
        const interval = setInterval(checkLive, 60000);
        return () => clearInterval(interval);
    }, [currentSettings, currentCampusSlots, orderSettings]);

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
                                unoptimized
                            />
                        </Link>
                        {/* Mobile Live Indicator & Community */}
                        <div className="md:hidden flex items-center gap-2">
                            <CommunityDropdown groups={whatsappGroups} />
                            {shouldShowLiveIndicator && (
                                <LiveIndicator
                                    isLive={isLive}
                                    settings={currentSettings}
                                    label={settingsLabel}
                                    hasPreOrder={hasPreOrder}
                                    preOrderRestaurantNames={preOrderRestaurantNames}
                                />
                            )}
                        </div>
                    </div>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-300">
                        <Link href="/" className="hover:text-white transition-colors">
                            Home
                        </Link>
                        <Link
                            href="/delivery"
                            className={`hover:text-white transition-colors ${pathname === "/delivery" ? "text-white font-bold" : ""}`}
                        >
                            Food
                        </Link>
                        <Link
                            href="/laundry"
                            className={`hover:text-white transition-colors ${pathname === "/laundry" ? "text-white font-bold" : ""}`}
                        >
                            Laundry
                        </Link>
                        <Link
                            href="/grocery"
                            className={`hover:text-white transition-colors ${pathname === "/grocery" ? "text-white font-bold" : ""}`}
                        >
                            Grocery
                        </Link>
                        <Link
                            href="/marketplace"
                            className={`hover:text-white transition-colors ${pathname === "/marketplace" ? "text-white font-bold" : ""}`}
                        >
                            Marketplace
                        </Link>
                        <CommunityDropdown groups={whatsappGroups} />
                        {shouldShowLiveIndicator && (
                            <LiveIndicator
                                isLive={isLive}
                                settings={currentSettings}
                                label={settingsLabel}
                                hasPreOrder={hasPreOrder}
                                preOrderRestaurantNames={preOrderRestaurantNames}
                            />
                        )}
                    </div>

                    {/* Right side: User Auth + Cart */}
                    <div className="flex items-center gap-3 md:gap-4">
                        {/* User Auth */}
                        {!authLoading &&
                            (authUser ? (
                                <UserMenu user={authUser} logout={authLogout} />
                            ) : (
                                <Link
                                    href="/login"
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                                >
                                    <LogIn size={16} className="text-gray-300" />
                                    <span className="text-xs font-bold text-gray-300 hidden md:inline">
                                        Login
                                    </span>
                                </Link>
                            ))}

                        <WhatsNewBell />

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 rounded-full hover:bg-white/10 transition-colors group"
                        >
                            <ShoppingBag
                                size={24}
                                className="text-gray-200 group-hover:text-white transition-colors"
                            />
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
            {isLoaded && (
                <CampusSelector
                    currentCampus={userDetails.campus}
                    onSelect={(campus) => setUserDetails((prev) => ({ ...prev, campus }))}
                />
            )}
        </>
    );
}
