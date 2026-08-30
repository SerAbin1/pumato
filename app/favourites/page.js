"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Loader2, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { useCart } from "@/app/context/CartContext";
import { useFavourites } from "@/app/hooks/useFavourites";
import { resolveFavourites } from "@/lib/favourites";
import useFirestore from "@/app/hooks/useFirestore";
import { COLLECTIONS } from "@/lib/constants";

export default function FavouritesPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useUserAuth();
    const { addToCart, setIsCartOpen } = useCart();
    const { favourites, loaded, toggle } = useFavourites(user);
    const { getCollection } = useFirestore();

    const [restaurants, setRestaurants] = useState([]);
    const [loadingRestaurants, setLoadingRestaurants] = useState(true);

    useEffect(() => {
        getCollection(COLLECTIONS.RESTAURANTS)
            .then(setRestaurants)
            .catch((error) => console.error("Failed to load restaurants:", error))
            .finally(() => setLoadingRestaurants(false));
    }, [getCollection]);

    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    const entries = resolveFavourites(favourites, restaurants);

    const add = (entry) => {
        addToCart(
            {
                id: entry.item.id,
                name: entry.item.name,
                price: Number(entry.item.price),
                unitPrice: Number(entry.item.price),
                restaurantId: entry.restaurantId,
                restaurantName: entry.restaurantName,
                category: entry.item.category,
                isVeg: entry.item.isVeg ?? false,
            },
            1
        );
        setIsCartOpen(true);
        toast.success(`${entry.item.name} added to cart`);
    };

    if (authLoading || !loaded || loadingRestaurants) {
        return (
            <div className="min-h-screen bg-black text-white">
                <Navbar />
                <div className="flex items-center justify-center pt-40">
                    <Loader2 size={40} className="animate-spin text-orange-500" />
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 py-8 pt-24">
                <Link
                    href="/"
                    className="inline-flex items-center text-gray-400 hover:text-white text-sm font-medium transition-colors mb-4"
                >
                    <ArrowLeft size={16} className="mr-2" /> Back to Store
                </Link>

                <h1 className="text-4xl font-black tracking-tight mb-8">Favourites</h1>

                {entries.length === 0 ? (
                    <div className="text-center py-20">
                        <Heart size={48} className="mx-auto text-gray-700 mb-4" />
                        <p className="text-gray-400 font-medium mb-6">
                            Nothing saved yet. Tap the heart on any dish to keep it here.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                        >
                            <ShoppingBag size={16} /> Browse restaurants
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {entries.map((entry) => (
                            <div
                                key={`${entry.restaurantId}:${entry.itemId}`}
                                className={`bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 ${
                                    entry.available ? "" : "opacity-50"
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-white truncate">{entry.name}</p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {entry.restaurantName || "Restaurant unavailable"}
                                    </p>
                                    {entry.item && (
                                        <p className="text-sm font-bold text-gray-300 mt-1">
                                            ₹{entry.item.price}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {entry.available ? (
                                        <button
                                            onClick={() => add(entry)}
                                            className="text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl transition-colors"
                                        >
                                            Add
                                        </button>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                            {entry.item ? "Unavailable" : "Removed"}
                                        </span>
                                    )}
                                    <button
                                        onClick={() =>
                                            toggle({
                                                restaurantId: entry.restaurantId,
                                                itemId: entry.itemId,
                                            })
                                        }
                                        aria-label={`Remove ${entry.name} from favourites`}
                                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <Heart size={18} className="text-red-500 fill-red-500" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
