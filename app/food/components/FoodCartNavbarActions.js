"use client";

import { ShoppingBag } from "lucide-react";

import { useFoodCart } from "@/app/food/context/FoodCartContext";
import FoodCartDrawer from "@/app/food/components/FoodCartDrawer";

export default function FoodCartNavbarActions() {
    const { setIsCartOpen, totalItems } = useFoodCart();

    return (
        <>
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
            <FoodCartDrawer />
        </>
    );
}
