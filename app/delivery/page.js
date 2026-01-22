"use client";

import Navbar from "../components/Navbar";
import RestaurantList from "../components/RestaurantList";
import FoodCollections from "../components/FoodCollections";
import Link from "next/link";
import { Search, Sparkles, Utensils, ArrowRight, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/app/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

import { db } from "@/lib/firebase";
import { doc } from "firebase/firestore";
import useFirestore from "@/app/hooks/useFirestore";

export default function DeliveryPage() {
    const { addToCart } = useCart();
    const { getCollection, getDocument, loading: dbLoading } = useFirestore();
    const [toast, setToast] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [filteredRestaurants, setFilteredRestaurants] = useState([]);
    const [filteredFoods, setFilteredFoods] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [promoBanners, setPromoBanners] = useState(null);

    // Fetch banners on load
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const data = await getDocument("site_content", "promo_banners");
                if (data) {
                    setPromoBanners(data);
                } else {
                    // Fallback if no banners exist in Firebase
                    setPromoBanners({
                        banner1: { title: "50% OFF", sub: "Welcome Bonus", hidden: false },
                        banner2: { title: "Free Delivery", sub: "On all orders", hidden: false },
                        banner3: { title: "Tasty Deals", sub: "Flat ₹100 Off", hidden: false }
                    });
                }
            } catch (err) {
                // Fallback on error (handled by hook, but we need default state)
                setPromoBanners({
                    banner1: { title: "50% OFF", sub: "Welcome Bonus", hidden: false },
                    banner2: { title: "Free Delivery", sub: "On all orders", hidden: false },
                    banner3: { title: "Tasty Deals", sub: "Flat ₹100 Off", hidden: false }
                });
            }
        };
        fetchBanners();
    }, [getDocument]);

    // Fetch restaurants on load
    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const data = await getCollection("restaurants");
                setRestaurants(data);
                setFilteredRestaurants(data);
            } catch (err) {
                // Error already logged by hook
            }
        };
        fetchRestaurants();
    }, [getCollection]);

    // Apply search filtering
    useEffect(() => {
        if (!searchQuery) {
            setFilteredRestaurants(restaurants);
            setFilteredFoods([]);
            return;
        }

        const query = searchQuery.toLowerCase();

        // 1. Filter Restaurants (Name or Cuisine match OR has matching menu item)
        const matchedRestaurants = restaurants.filter(r => {
            const nameMatch = r.name.toLowerCase().includes(query);
            const cuisineMatch = r.cuisine.toLowerCase().includes(query);
            const menuMatch = r.menu?.some(item => item.name.toLowerCase().includes(query));
            return nameMatch || cuisineMatch || menuMatch;
        });

        // 2. Find specific matching foods (Global Search)
        const matchedFoods = [];
        restaurants.forEach(r => {
            if (r.menu) {
                r.menu.forEach(item => {
                    if (item.name.toLowerCase().includes(query)) {
                        matchedFoods.push({ ...item, restaurantId: r.id, restaurantName: r.name });
                    }
                });
            }
        });

        setFilteredRestaurants(matchedRestaurants);
        setFilteredFoods(matchedFoods);
    }, [restaurants, searchQuery]);



    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden">
            {/* Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* Ambient Backgrounds */}
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"></div>

            <Navbar />

            {/* Promo Banners Section (Above Search) */}
            <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
                {promoBanners && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { ...promoBanners.banner1, key: "banner1" },
                            { ...promoBanners.banner2, key: "banner2" },
                            { ...promoBanners.banner3, key: "banner3" }
                        ].filter(promo => !promo.hidden).map((promo, i) => (
                            <motion.div
                                key={promo.key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -5, scale: 1.02 }}
                                className={`bg-gradient-to-br ${promo.gradient || "from-gray-800 to-black"} rounded-[2rem] p-8 text-white relative overflow-hidden h-48 flex flex-col justify-center shadow-lg border border-white/10 group cursor-pointer`}
                            >
                                <div className={`relative z-10 ${promo.image ? 'w-2/3' : 'w-full'}`}>
                                    <span className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 inline-flex items-center gap-1"><Sparkles size={10} /> Limited Time</span>
                                    <h3 className="text-3xl font-black italic tracking-tighter shadow-black/50 drop-shadow-lg">{promo.title}</h3>
                                    <p className="font-medium opacity-90 text-sm mt-1 text-white/90 drop-shadow-md">{promo.sub}</p>
                                </div>
                                {promo.image && (
                                    <img src={promo.image} className="absolute -right-10 -bottom-10 w-48 h-48 object-cover rounded-full group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl border-4 border-white/10" alt="Offer" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Sticky Header / Search Section */}
            <div className="sticky top-20 z-30 pt-6 pb-4 border-b border-white/5 bg-black/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search Bar */}
                        <div className="w-full flex items-center bg-white/10 border border-white/10 rounded-2xl px-5 py-4 shadow-inner focus-within:bg-black/40 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all group">
                            <Search className="text-gray-400 mr-3 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search 'Biryani' or 'Pizza'..."
                                className="w-full bg-transparent border-none outline-none text-white placeholder-gray-500 font-medium"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>


                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 space-y-16 py-12 relative z-10">



                {/* Food Collections (Horizontal Scroll) */}
                {/* Note: FoodCollections component will need its own dark mode update, skipping for now to keep focus on page layout */}
                {/* <FoodCollections /> */}



                {/* Search Results: Global Menu Items */}
                {searchQuery && filteredFoods.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-green-500 rounded-full"></span> Matching Dishes
                            </h2>
                            <span className="text-gray-500 font-medium px-3 py-1 bg-white/5 rounded-full text-xs">{filteredFoods.length} items</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredFoods.map((item, idx) => {
                                const isOutOfStock = item.isVisible === false;
                                return (
                                    <div key={`${item.restaurantId}-${idx}`} className={`flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl transition-all group relative ${isOutOfStock ? 'opacity-50' : 'hover:bg-white/10'}`}>
                                        <Link href={`/restaurant?id=${item.restaurantId}&highlight=${encodeURIComponent(item.name)}`} className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-20 h-20 flex-shrink-0 bg-white/5 rounded-xl overflow-hidden relative">
                                                {item.image ? (
                                                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                                                ) : (
                                                    <div className="flex items-center justify-center w-full h-full text-gray-500"><Utensils size={20} /></div>
                                                )}
                                                {isOutOfStock && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <span className="text-[8px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded uppercase tracking-tighter">Sold Out</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">{item.name}</h4>
                                                <p className="text-xs text-gray-400 mb-1">{item.restaurantName}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-green-400">₹{item.price}</p>
                                                    {isOutOfStock && <span className="text-[10px] font-bold text-red-400 uppercase tracking-tighter">Out of stock</span>}
                                                </div>
                                            </div>
                                        </Link>
                                        {isOutOfStock ? (
                                            <div className="bg-gray-800 text-gray-500 px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-tighter cursor-not-allowed">
                                                Unavailable
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart({ ...item, restaurantId: item.restaurantId, restaurantName: item.restaurantName });
                                                    setToast(`Added ${item.name}`);
                                                    setTimeout(() => setToast(null), 2000);
                                                }}
                                                className="bg-white text-black px-4 py-2 rounded-xl font-black text-xs hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
                                            >
                                                ADD
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Restaurant List */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span> All Restaurants
                        </h2>
                        <span className="text-gray-500 font-medium px-3 py-1 bg-white/5 rounded-full text-xs">{filteredRestaurants.length} active</span>
                    </div>
                    {/* The RestaurantList component accepts props, but internally renders separate cards. 
                        We need to pass a "darkMode" prop or update the component itself. 
                        For now, assuming we will update RestaurantList next. 
                    */}
                    <RestaurantList restaurants={filteredRestaurants} />

                </section>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 font-bold backdrop-blur-md border border-white/10"
                    >
                        <ShoppingBag size={18} /> {toast}
                    </motion.div>
                )
                }
            </AnimatePresence>
        </main>
    );
}
