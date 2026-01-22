"use client";

import Link from "next/link";
import { ShoppingBag, Search, Menu } from "lucide-react";
import { useCart } from "../context/CartContext";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import CartDrawer from "./CartDrawer";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function Navbar() {
    const { setIsCartOpen, totalItems } = useCart();
    const [isScrolled, setIsScrolled] = useState(false);
    const { scrollY } = useScroll();
    const pathname = usePathname();

    useMotionValueEvent(scrollY, "change", (latest) => {
        if (latest > 50) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }
    });

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

                    <div className="flex items-center gap-6 md:gap-8">
                        <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-300">
                            <Link href="/" className="hover:text-white transition-colors">Home</Link>
                            <Link href="/delivery" className={`hover:text-white transition-colors ${pathname === '/delivery' ? 'text-white font-bold' : ''}`}>Food</Link>
                            <Link href="/coming-soon" className={`hover:text-white transition-colors ${pathname === '/coming-soon' ? 'text-white font-bold' : ''}`}>Laundry</Link>
                            <Link href="/coming-soon" className={`hover:text-white transition-colors ${pathname === '/coming-soon' ? 'text-white font-bold' : ''}`}>Grocery</Link>
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
