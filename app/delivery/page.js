"use client";

import Navbar from "../components/Navbar";
import RestaurantList from "../components/RestaurantList";
import FoodCollections from "../components/FoodCollections";
import { Search, MapPin, SlidersHorizontal, ChevronDown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function DeliveryPage() {
    const [restaurants, setRestaurants] = useState([]);
    const [filteredRestaurants, setFilteredRestaurants] = useState([]);
    const [activeFilters, setActiveFilters] = useState({
        sort: null,
        rating: false,
        pureVeg: false,
        fastDelivery: false,
        offers: false
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [promoBanners, setPromoBanners] = useState(null);

    // Fetch banners on load
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const docSnap = await getDoc(doc(db, "site_content", "promo_banners"));
                if (docSnap.exists()) {
                    setPromoBanners(docSnap.data());
                } else {
                    // Fallback if no banners exist in Firebase
                    setPromoBanners({
                        banner1: { title: "50% OFF", sub: "Welcome Bonus", hidden: false },
                        banner2: { title: "Free Delivery", sub: "On all orders", hidden: false },
                        banner3: { title: "Tasty Deals", sub: "Flat ₹100 Off", hidden: false }
                    });
                }
            } catch (err) {
                console.error("Failed to fetch banners", err);
                // Fallback on error
                setPromoBanners({
                    banner1: { title: "50% OFF", sub: "Welcome Bonus", hidden: false },
                    banner2: { title: "Free Delivery", sub: "On all orders", hidden: false },
                    banner3: { title: "Tasty Deals", sub: "Flat ₹100 Off", hidden: false }
                });
            }
        };
        fetchBanners();
    }, []);

    // Fetch restaurants on load
    useEffect(() => {
        const fetchRestaurants = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "restaurants"));
                const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setRestaurants(data);
                setFilteredRestaurants(data);
            } catch (err) {
                console.error("Failed to fetch restaurants", err);
            }
        };
        fetchRestaurants();
    }, []);

    // Apply filtering and sorting
    useEffect(() => {
        let result = [...restaurants];

        if (searchQuery) {
            result = result.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.cuisine.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (activeFilters.rating) {
            result = result.filter(r => r.rating >= 4.0);
        }

        if (activeFilters.pureVeg) {
            result = result.filter(r => r.cuisine.toLowerCase().includes("veg"));
        }

        if (activeFilters.fastDelivery) {
            result = result.filter(r => {
                const timeStr = r.deliveryTime || "30 mins";
                const mins = parseInt(timeStr.split(" ")[0]);
                return mins <= 30;
            });
        }

        if (activeFilters.offers) {
            result = result.filter(r => !!r.offer);
        }

        if (activeFilters.sort === "rating") {
            result.sort((a, b) => b.rating - a.rating);
        } else if (activeFilters.sort === "time") {
            result.sort((a, b) => {
                const timeA = parseInt((a.deliveryTime || "30 mins").split(" ")[0]);
                const timeB = parseInt((b.deliveryTime || "30 mins").split(" ")[0]);
                return timeA - timeB;
            });
        }

        setFilteredRestaurants(result);
    }, [restaurants, activeFilters, searchQuery]);

    const toggleFilter = (filterKey) => {
        if (filterKey === 'sort') {
            setActiveFilters(prev => ({
                ...prev,
                sort: prev.sort === null ? 'rating' : (prev.sort === 'rating' ? 'time' : null)
            }));
            return;
        }

        setActiveFilters(prev => ({
            ...prev,
            [filterKey]: !prev[filterKey]
        }));
    };

    const getFilterStyle = (isActive) => {
        return isActive
            ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/40"
            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20";
    };

    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden">
            {/* Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* Ambient Backgrounds */}
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-600/10 rounded-full blur-[100px] pointer-events-none"></div>

            <Navbar />

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

                    {/* Filters */}
                    <div className="flex gap-3 mt-5 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => toggleFilter('sort')}
                            className={`border px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0 ${getFilterStyle(activeFilters.sort !== null)}`}
                        >
                            <SlidersHorizontal size={14} />
                            Sort {activeFilters.sort === 'rating' ? '(Rating)' : (activeFilters.sort === 'time' ? '(Time)' : '')}
                        </button>

                        <button
                            onClick={() => toggleFilter('rating')}
                            className={`border px-5 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 ${getFilterStyle(activeFilters.rating)}`}
                        >
                            Rating 4.0+
                        </button>

                        <button
                            onClick={() => toggleFilter('pureVeg')}
                            className={`border px-5 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 ${getFilterStyle(activeFilters.pureVeg)}`}
                        >
                            Pure Veg
                        </button>

                        <button
                            onClick={() => toggleFilter('fastDelivery')}
                            className={`border px-5 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 ${getFilterStyle(activeFilters.fastDelivery)}`}
                        >
                            Fast Delivery
                        </button>

                        <button
                            onClick={() => toggleFilter('offers')}
                            className={`border px-5 py-2 rounded-full text-xs font-bold transition-all flex-shrink-0 ${getFilterStyle(activeFilters.offers)}`}
                        >
                            Offers
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 space-y-16 py-12 relative z-10">

                {/* Promo Banners */}
                {promoBanners && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { ...promoBanners.banner1, gradient: "from-blue-600 to-blue-800", img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80", key: "banner1" },
                            { ...promoBanners.banner2, gradient: "from-orange-500 to-red-600", img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80", key: "banner2" },
                            { ...promoBanners.banner3, gradient: "from-emerald-600 to-emerald-800", img: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&q=80", key: "banner3" }
                        ].filter(promo => !promo.hidden).map((promo, i) => (
                            <motion.div
                                key={promo.key}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                whileHover={{ y: -5, scale: 1.02 }}
                                className={`bg-gradient-to-br ${promo.gradient} rounded-[2rem] p-8 text-white relative overflow-hidden h-48 flex flex-col justify-center shadow-lg border border-white/10 group cursor-pointer`}
                            >
                                <div className="relative z-10">
                                    <span className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 inline-flex items-center gap-1"><Sparkles size={10} /> Limited Time</span>
                                    <h3 className="text-3xl font-black italic tracking-tighter">{promo.title}</h3>
                                    <p className="font-medium opacity-90 text-sm mt-1 text-white/90">{promo.sub}</p>
                                </div>
                                <img src={promo.img} className="absolute -right-10 -bottom-10 w-48 h-48 object-cover rounded-full group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl border-4 border-white/10" alt="Offer" />
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Food Collections (Horizontal Scroll) */}
                {/* Note: FoodCollections component will need its own dark mode update, skipping for now to keep focus on page layout */}
                {/* <FoodCollections /> */}



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
        </main>
    );
}
