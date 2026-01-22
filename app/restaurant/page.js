"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/app/context/CartContext";
import Navbar from "@/app/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowLeft, Search, Dot, ShoppingBag, ChevronDown, Utensils, X, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc } from "firebase/firestore";
import useFirestore from "@/app/hooks/useFirestore";

function RestaurantContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    const [restaurant, setRestaurant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState("default"); // default, asc, desc
    const [searchQuery, setSearchQuery] = useState("");
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({});

    const { addToCart, cartItems, itemTotal, totalItems, isCartOpen, setIsCartOpen } = useCart();
    const { getDocument, loading: dbLoading } = useFirestore();
    const highlight = searchParams.get("highlight");

    // Scroll to highlighted item
    useEffect(() => {
        if (highlight && !loading && restaurant) {
            const idString = `menu-item-${highlight.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
            // Small delay to ensure rendering
            setTimeout(() => {
                const element = document.getElementById(idString);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-2', 'ring-orange-500', 'bg-white/10');
                    setTimeout(() => element.classList.remove('ring-2', 'ring-orange-500', 'bg-white/10'), 2500);
                }
            }, 500);
        }
    }, [highlight, loading, restaurant]);

    useEffect(() => {
        if (!id) return;
        const fetchRestaurant = async () => {
            try {
                const data = await getDocument("restaurants", id);
                if (data) {
                    setRestaurant(data);
                } else {
                    setRestaurant(null);
                }
            } catch (error) {
                // Error handled by hook
            }
            setLoading(false);
        };
        fetchRestaurant();
    }, [id, getDocument]);

    // Derived state for filtering
    const processedMenu = useMemo(() => {
        if (!restaurant || !restaurant.menu) return {};

        let items = restaurant.menu.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filter === "all"
                ? true
                : filter === "veg"
                    ? item.isVeg
                    : !item.isVeg;
            // Note: isVisible === false items are shown but marked as "Out of Stock"
            return matchesSearch && matchesFilter;
        });

        if (sortOrder !== "default") {
            items.sort((a, b) => {
                const priceA = parseInt(a.price) || 0;
                const priceB = parseInt(b.price) || 0;
                return sortOrder === "asc" ? priceA - priceB : priceB - priceA;
            });
        }

        // Group by category
        return items.reduce((acc, item) => {
            const cat = item.category || "Recommended";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(item);
            return acc;
        }, {});
    }, [restaurant, searchQuery, filter, sortOrder]);

    const scrollToCategory = (cat) => {
        const el = document.getElementById(cat);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setShowMenuModal(false);
        }
    };

    const toggleSection = (category) => {
        setCollapsedSections(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
    );

    if (!restaurant) return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Restaurant not found</h2>
                <Link href="/delivery" className="text-orange-500 hover:underline">Go back to Delivery</Link>
            </div>
        </div>
    );

    return (
        <main className="min-h-screen bg-black text-white pb-32 relative overflow-x-hidden selection:bg-orange-500 selection:text-white">
            {/* Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* Ambient Glow */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-orange-900/10 rounded-full blur-[120px] pointer-events-none" />

            <Navbar />

            {/* Premium Header */}
            <div className="relative h-[300px] md:h-[400px] w-full">
                <motion.img
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1 }}
                    src={restaurant.image}
                    alt={restaurant.name}
                    className={`w-full h-full object-cover ${restaurant.isVisible === false ? 'grayscale-[0.8] opacity-60' : ''}`}
                />
                {restaurant.isVisible === false && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                        <div className="bg-red-600/90 backdrop-blur-md text-white px-8 py-4 rounded-3xl shadow-2xl border border-white/20 text-center scale-110">
                            <h2 className="text-2xl font-black uppercase tracking-widest mb-1">Temporarily Closed</h2>
                            <p className="text-sm font-medium opacity-90">This restaurant is not accepting orders right now</p>
                        </div>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex items-end p-4 md:p-8">
                    <div className="w-full max-w-7xl mx-auto z-10">
                        <Link href="/delivery" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors text-sm font-bold backdrop-blur-md bg-white/10 px-4 py-2 rounded-full border border-white/10 hover:bg-white/20">
                            <ArrowLeft size={16} /> Back to Restaurants
                        </Link>
                        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                            <div>
                                <motion.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-4xl md:text-6xl font-black mb-2 tracking-tight text-white drop-shadow-2xl"
                                >
                                    {restaurant.name}
                                </motion.h1>
                                <p className="text-lg md:text-xl opacity-90 font-medium text-gray-300">{restaurant.cuisine}</p>
                                <div className="flex items-center gap-4 mt-4 text-sm font-bold text-gray-300">
                                    <span className="flex items-center gap-1">30-35 mins</span>
                                    <span className="flex items-center gap-1"><Dot /> {restaurant.priceForTwo || "Standard Menu"}</span>
                                </div>
                            </div>
                            {restaurant.offer && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-2xl font-black text-xl italic shadow-2xl border border-white/20"
                                >
                                    {restaurant.offer}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">

                {/* Filters & Search Toolbar */}
                <div className="sticky top-20 z-20 bg-black/80 backdrop-blur-xl py-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-white/10">
                    <div className="relative w-full md:w-auto flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search for dishes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium placeholder-gray-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <button
                            onClick={() => setSortOrder(prev => prev === "default" ? "asc" : (prev === "asc" ? "desc" : "default"))}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 whitespace-nowrap ${sortOrder !== "default" ? "bg-white text-black border-white shadow-lg" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"}`}
                        >
                            <ArrowUpDown size={14} />
                            {sortOrder === "default" ? "Sort" : (sortOrder === "asc" ? "Low-High" : "High-Low")}
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0"></div>

                        {['all', 'veg', 'non-veg'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${filter === f ? "bg-white text-black border-white shadow-lg" : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Categorized Menu */}
                <div className="space-y-12">
                    {Object.entries(processedMenu).map(([category, items]) => (
                        <div key={category} id={category} className="scroll-mt-40">
                            <button
                                onClick={() => toggleSection(category)}
                                className="w-full text-2xl font-bold text-white mb-6 flex items-center justify-between gap-3 hover:text-orange-400 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
                                    {category} <span className="text-gray-500 text-base font-normal">({items.length})</span>
                                </div>
                                <motion.div
                                    animate={{ rotate: collapsedSections[category] ? -180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-gray-500 group-hover:text-orange-400"
                                >
                                    <ChevronDown size={24} />
                                </motion.div>
                            </button>
                            <AnimatePresence initial={false}>
                                {!collapsedSections[category] && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="grid gap-6">
                                            {items.map((item, idx) => {
                                                const cartItem = cartItems.find(c => c.id === item.id);
                                                const quantity = cartItem ? cartItem.quantity : 0;
                                                const isOutOfStock = item.isVisible === false;

                                                return (
                                                    <motion.div
                                                        key={item.id}
                                                        id={`menu-item-${item.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        whileInView={{ opacity: 1, y: 0 }}
                                                        viewport={{ once: true, margin: "-50px" }}
                                                        transition={{ delay: idx * 0.05 }}
                                                        className={`bg-white/5 p-4 md:p-6 rounded-[2rem] border border-white/5 flex gap-4 md:gap-8 group transition-all ${isOutOfStock ? 'opacity-50' : 'hover:bg-white/10 hover:border-white/10 hover:shadow-2xl'}`}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    {item.isVeg !== false ? (
                                                                        <div className="border border-green-500 p-0.5 rounded-[4px]">
                                                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="border border-red-500 p-0.5 rounded-[4px]">
                                                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-red-500"></div>
                                                                        </div>
                                                                    )}
                                                                    {item.isBestSeller && (
                                                                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-orange-500/20">Bestseller</span>
                                                                    )}
                                                                    {item.extraInfo && (
                                                                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-500/20">{item.extraInfo}</span>
                                                                    )}
                                                                    {isOutOfStock && (
                                                                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider border border-red-500/20">Out of Stock</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <h3 className="font-bold text-xl text-white group-hover:text-orange-400 transition-colors mb-1">{item.name}</h3>
                                                            <p className="font-bold text-gray-300">₹{item.price}</p>
                                                            <p className="text-gray-500 text-sm mt-3 line-clamp-2 leading-relaxed font-medium">{item.description}</p>
                                                        </div>

                                                        <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-2xl shadow-lg border border-white/5" />
                                                            ) : (
                                                                <div className="w-full h-full bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center">
                                                                    <Utensils className="text-white/20" size={32} />
                                                                </div>
                                                            )}
                                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[90%] shadow-xl">
                                                                {restaurant.isVisible === false ? (
                                                                    <div className="w-full bg-gray-800 text-gray-500 border border-gray-700 py-2 rounded-xl font-bold uppercase text-xs text-center tracking-widest cursor-not-allowed">
                                                                        Offline
                                                                    </div>
                                                                ) : isOutOfStock ? (
                                                                    <div className="w-full bg-gray-600 text-gray-300 border border-gray-500 py-2 rounded-xl font-bold uppercase text-xs text-center tracking-widest cursor-not-allowed">
                                                                        Unavailable
                                                                    </div>
                                                                ) : quantity === 0 ? (
                                                                    <motion.button
                                                                        whileTap={{ scale: 0.95 }}
                                                                        onClick={() => addToCart({ ...item, restaurantId: restaurant.id, restaurantName: restaurant.name })}
                                                                        className="w-full bg-white text-black border border-white py-2 rounded-xl font-black uppercase text-xs hover:bg-gray-200 transition-colors tracking-widest"
                                                                    >
                                                                        ADD
                                                                    </motion.button>
                                                                ) : (
                                                                    <div className="w-full bg-black text-white border border-white/20 shadow-lg py-2 rounded-xl font-bold flex items-center justify-between px-3">
                                                                        <button onClick={() => addToCart({ ...item, restaurantId: restaurant.id, restaurantName: restaurant.name }, -1)} className="hover:text-orange-500 transition-colors w-6">-</button>
                                                                        <span className="text-sm">{quantity}</span>
                                                                        <button onClick={() => addToCart({ ...item, restaurantId: restaurant.id, restaurantName: restaurant.name }, 1)} className="hover:text-orange-500 transition-colors w-6">+</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            <hr className="mt-12 border-white/5 border-dashed" />
                        </div>
                    ))}

                    {Object.keys(processedMenu).length === 0 && (
                        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/5 border-dashed">
                            <Utensils className="mx-auto text-gray-600 mb-4" size={48} />
                            <p className="text-gray-400 text-lg">No items match your filters.</p>
                            <button onClick={() => { setFilter("all"); setSearchQuery(""); }} className="mt-4 text-orange-500 font-bold hover:text-white transition-colors">Clear Filters</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Browse Menu Button */}
            <AnimatePresence>
                {Object.keys(processedMenu).length > 0 && (
                    <motion.button
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        onClick={() => setShowMenuModal(true)}
                        className="fixed bottom-24 right-6 bg-white text-black px-6 py-3 rounded-full shadow-2xl shadow-white/10 flex items-center gap-2 z-30 hover:scale-105 transition-transform font-bold pointer-events-auto border-2 border-black"
                    >
                        <Utensils size={18} /> Browse Menu
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Menu Category Modal */}
            <AnimatePresence>
                {showMenuModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowMenuModal(false)}
                            className="fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25 }}
                            className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-white/10 z-50 rounded-t-[2rem] max-h-[70vh] overflow-y-auto pb-10 shadow-2xl"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-black text-white">Menu Categories</h3>
                                    <button onClick={() => setShowMenuModal(false)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors"><X size={20} /></button>
                                </div>
                                <div className="grid gap-3">
                                    {Object.keys(processedMenu).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => scrollToCategory(cat)}
                                            className="text-left w-full p-4 rounded-xl hover:bg-white/5 flex justify-between items-center border border-transparent hover:border-white/5 transition-all font-bold text-gray-300 hover:text-white"
                                        >
                                            {cat} <span className="bg-white/10 px-2 py-1 rounded text-xs text-gray-400">{processedMenu[cat].length} items</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Sticky Cart Footer */}
            <AnimatePresence>
                {totalItems > 0 && !isCartOpen && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-6"
                    >
                        <div
                            className="max-w-2xl mx-auto bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-2xl shadow-2xl shadow-orange-900/50 flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform border border-white/10"
                            onClick={() => setIsCartOpen(true)}
                        >
                            <div className="flex flex-col">
                                <span className="font-black text-xs uppercase tracking-widest opacity-80">{totalItems} ITEMS ADDED</span>
                                <span className="font-bold text-xl">₹{itemTotal} <span className="font-normal text-sm opacity-80">+ taxes</span></span>
                            </div>
                            <div className="flex items-center gap-2 font-bold text-lg bg-black/20 px-4 py-2 rounded-xl backdrop-blur-md">
                                View Cart <ShoppingBag size={20} fill="currentColor" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </main>
    );
}

export default function RestaurantPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>}>
            <RestaurantContent />
        </Suspense>
    );
}
