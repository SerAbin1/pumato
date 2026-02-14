"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { LogOut, ArrowLeft, Utensils, Truck, ShoppingCart, Clock, Settings, Tag, Sparkles, Loader2, Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

// Import Extracted Components
import RestaurantsTab from "./components/RestaurantsTab";
import CouponsTab from "./components/CouponsTab";
import BannersTab from "./components/BannersTab";
import LaundrySettings from "./components/LaundrySettings";
import DeliverySettings from "./components/DeliverySettings";
import GrocerySettings from "./components/GrocerySettings";
import GlobalSettings from "./components/GlobalSettings";
import StickyActionBar from "./components/StickyActionBar";

import { format12h } from "@/lib/formatters";

export default function AdminPage() {
    const router = useRouter();
    const { user, isAdmin, loading: authLoading, logout } = useAdminAuth();

    const [activeSection, setActiveSection] = useState("restaurants"); // restaurants, coupons, laundry, delivery, grocery, settings, banners
    const [restaurants, setRestaurants] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [banners, setBanners] = useState({
        banner1: { title: "50% OFF", sub: "Welcome Bonus", hidden: false },
        banner2: { title: "Free Delivery", sub: "On all orders", hidden: false },
        banner3: { title: "Tasty Deals", sub: "Flat ₹100 Off", hidden: false }
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Laundry Slots State
    const [selectedDay, setSelectedDay] = useState("default");
    const [laundrySlots, setLaundrySlots] = useState([]);
    const [slotStart, setSlotStart] = useState("");
    const [slotEnd, setSlotEnd] = useState("");
    const [campusConfig, setCampusConfig] = useState(DEFAULT_CAMPUS_CONFIG);
    const [laundryPricing, setLaundryPricing] = useState({ pricePerKg: "", steamIronPrice: "" });

    // Site Settings
    const [orderSettings, setOrderSettings] = useState({
        slots: [{ start: "18:30", end: "23:00" }],
        baseDeliveryCharge: "30",
        extraItemThreshold: "3",
        extraItemCharge: "10",
        lightItems: [],
        lightItemThreshold: "5"
    });
    const [grocerySettings, setGrocerySettings] = useState({ slots: [{ start: "10:00", end: "22:00" }] });

    useEffect(() => {
        // Redirect to login if not authenticated or not admin
        if (!authLoading && (!user || !isAdmin)) {
            router.push("/admin/login");
        }
    }, [authLoading, user, isAdmin, router]);

    useEffect(() => {
        if (user && isAdmin) {
            fetchData();
        }
    }, [user, isAdmin]);

    // Fetch Laundry Slots when date changes or section becomes active
    useEffect(() => {
        if (activeSection === 'laundry') {
            fetchLaundrySlots(selectedDay);
            fetchCampusConfig();
        }
    }, [activeSection, selectedDay]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resSnap, promoRes] = await Promise.all([
                getDocs(collection(db, "restaurants")),
                (async () => {
                    const idToken = await user.getIdToken();
                    return supabase.functions.invoke("manage-coupons", {
                        body: { action: "FETCH_ALL" },
                        headers: { "Authorization": `Bearer ${idToken}` }
                    });
                })()
            ]);

            const restaurantsData = resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

            // --- AUTO-REVERT LOGIC (LAZY CHECK) ---
            const now = new Date();
            const timeInMinutes = now.getHours() * 60 + now.getMinutes();

            // Fetch order settings to determine current slot
            const settingsDoc = await getDoc(doc(db, "site_content", "order_settings"));
            let currentSlots = [{ start: "18:30", end: "23:00" }]; // Default
            if (settingsDoc.exists()) {
                const sData = settingsDoc.data();
                if (sData.startTime && !sData.slots) {
                    currentSlots = [{ start: sData.startTime, end: sData.endTime }];
                } else if (sData.slots) {
                    currentSlots = sData.slots;
                }
                setOrderSettings({ slots: currentSlots, ...sData }); // Set state here too
            }

            // Check if we are currently in a slot
            const isInSlot = currentSlots.some(slot => {
                const [startH, startM] = (slot.start || "00:00").split(":").map(Number);
                const [endH, endM] = (slot.end || "23:59").split(":").map(Number);
                const startMins = startH * 60 + startM;
                const endMins = endH * 60 + endM;
                return timeInMinutes >= startMins && timeInMinutes <= endMins;
            });

            const todayStr = now.toISOString().split('T')[0];
            const updates = [];

            const updatedRestaurants = restaurantsData.map(r => {
                if (!r.menu) return r;
                let hasChanges = false;
                const updatedMenu = r.menu.map(item => {
                    if (item.isVisible === false && item.hiddenAt) {
                        const hiddenDate = new Date(item.hiddenAt);
                        const hiddenDay = hiddenDate.toISOString().split('T')[0];

                        // 1. If hidden on a previous day, unhide
                        if (hiddenDay < todayStr) {
                            hasChanges = true;
                            return { ...item, isVisible: true, hiddenAt: null };
                        }

                        // 2. If hidden today, check multiple conditions
                        const hiddenTimeMins = hiddenDate.getHours() * 60 + hiddenDate.getMinutes();
                        const slotHiddenIn = currentSlots.find(slot => {
                            const [sH, sM] = (slot.start || "00:00").split(":").map(Number);
                            const [eH, eM] = (slot.end || "23:59").split(":").map(Number);
                            const start = sH * 60 + sM;
                            const end = eH * 60 + eM;
                            return hiddenTimeMins >= start && hiddenTimeMins <= end;
                        });

                        if (slotHiddenIn) {
                            const [eH, eM] = (slotHiddenIn.end || "23:59").split(":").map(Number);
                            const slotEndMins = eH * 60 + eM;

                            // If Update Time (Now) is past the end of the slot where it was hidden -> UNHIDE
                            if (timeInMinutes > slotEndMins) {
                                hasChanges = true;
                                return { ...item, isVisible: true, hiddenAt: null };
                            }
                        }

                        // 3. Fallback: If currently in a slot, check if hidden before this slot started
                        if (isInSlot) {
                            const activeSlot = currentSlots.find(slot => {
                                const [sH, sM] = (slot.start || "00:00").split(":").map(Number);
                                const [eH, eM] = (slot.end || "23:59").split(":").map(Number);
                                const startMins = sH * 60 + sM;
                                const endMins = eH * 60 + eM;
                                return timeInMinutes >= startMins && timeInMinutes <= endMins;
                            });

                            if (activeSlot) {
                                const [sH, sM] = (activeSlot.start || "00:00").split(":").map(Number);
                                const slotStartMins = sH * 60 + sM;

                                if (hiddenTimeMins < slotStartMins) {
                                    hasChanges = true;
                                    return { ...item, isVisible: true, hiddenAt: null };
                                }
                            }
                        }
                    }
                    return item;
                });

                if (hasChanges) {
                    updates.push(setDoc(doc(db, "restaurants", r.id), { ...r, menu: updatedMenu }));
                    return { ...r, menu: updatedMenu };
                }
                return r;
            });

            if (updates.length > 0) {
                await Promise.all(updates);
                console.log(`Auto-reverted ${updates.length} restaurants' items.`);
            }

            setRestaurants(updatedRestaurants);

            if (promoRes.error) throw promoRes.error;
            const mappedCoupons = (promoRes.data || []).map(c => ({
                id: c.id,
                code: c.code,
                type: c.type,
                value: c.value,
                description: c.description,
                minOrder: c.min_order,
                isVisible: c.is_visible,
                isActive: c.is_active,
                usageLimit: c.usage_limit,
                usedCount: c.used_count,
                restaurantId: c.restaurant_id,
                itemId: c.item_id
            }));
            setCoupons(mappedCoupons);

            // Fetch Banners
            const bannerDoc = await getDoc(doc(db, "site_content", "promo_banners"));
            if (bannerDoc.exists()) {
                setBanners(bannerDoc.data());
            }

            // Fetch Grocery Settings
            const groceryDoc = await getDoc(doc(db, "site_content", "grocery_settings"));
            if (groceryDoc.exists()) {
                setGrocerySettings(groceryDoc.data());
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            alert("Failed to load data");
        }
        setLoading(false);
    };

    const fetchLaundrySlots = async (dateOrType) => {
        try {
            const docRef = doc(db, "laundry_slots", dateOrType);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setLaundrySlots(docSnap.data().slots || []);
            } else {
                setLaundrySlots([]); // No custom slots for this date
            }
        } catch (error) {
            console.error("Error fetching slots:", error);
        }
    };

    const fetchCampusConfig = async () => {
        try {
            const docRef = doc(db, "general_settings", "laundry");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.campuses) setCampusConfig(data.campuses);
                setLaundryPricing(data.pricing || { pricePerKg: "79", steamIronPrice: "15" });
            } else {
                setCampusConfig(DEFAULT_CAMPUS_CONFIG);
                setLaundryPricing({ pricePerKg: "79", steamIronPrice: "15" });
            }
        } catch (error) {
            console.error("Error fetching campus config:", error);
        }
    };

    // --- SAVE HANDLERS ---

    const saveCampusConfig = async () => {
        try {
            await setDoc(doc(db, "general_settings", "laundry"), {
                campuses: campusConfig,
                pricing: laundryPricing
            });
            alert("Campus & Pricing settings saved!");
        } catch (error) {
            console.error("Error saving campus config:", error);
            alert("Failed to save settings.");
        }
    };

    const handleSaveBanners = async () => {
        setIsSaving(true);
        try {
            await setDoc(doc(db, "site_content", "promo_banners"), banners);
            alert("Banners updated successfully!");
        } catch (error) {
            console.error("Error saving banners:", error);
            alert("Failed to update banners");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await Promise.all([
                setDoc(doc(db, "site_content", "order_settings"), orderSettings),
                setDoc(doc(db, "site_content", "grocery_settings"), grocerySettings)
            ]);
            alert("Settings updated successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to update settings");
        } finally {
            setIsSaving(false);
        }
    };

    // --- LAUNDRY SLOT HANDLERS ---
    const handleAddSlot = async () => {
        if (!slotStart || !slotEnd) {
            alert("Please select both start and end times.");
            return;
        }

        const [startH, startM] = slotStart.split(":").map(Number);
        const [endH, endM] = slotEnd.split(":").map(Number);
        if (startH * 60 + startM >= endH * 60 + endM) {
            alert("Start time must be before end time.");
            return;
        }

        const formattedSlot = `${format12h(slotStart)} - ${format12h(slotEnd)}`;

        // Prevent duplicates
        if (laundrySlots.includes(formattedSlot)) {
            alert("This slot already exists.");
            return;
        }

        const updatedSlots = [...laundrySlots, formattedSlot].sort((a, b) => {
            const getMinutes = (s) => {
                const parts = s.split(' - ')[0].match(/(\d+):(\d+) (AM|PM)/);
                if (!parts) return 0;
                let h = parseInt(parts[1]);
                const m = parseInt(parts[2]);
                const amp = parts[3];
                if (amp === 'PM' && h !== 12) h += 12;
                if (amp === 'AM' && h === 12) h = 0;
                return h * 60 + m;
            };
            return getMinutes(a) - getMinutes(b);
        });

        setLaundrySlots(updatedSlots);
        setSlotStart("");
        setSlotEnd("");

        const targetDoc = selectedDay;

        try {
            await setDoc(doc(db, "laundry_slots", targetDoc), {
                slots: updatedSlots
            });
        } catch (error) {
            console.error("Error saving slot:", error);
            alert("Failed to save slot");
        }
    };

    const handleDeleteSlot = async (index) => {
        const updatedSlots = laundrySlots.filter((_, i) => i !== index);
        setLaundrySlots(updatedSlots);
        const targetDoc = selectedDay;
        try {
            await setDoc(doc(db, "laundry_slots", targetDoc), { slots: updatedSlots });
        } catch (error) {
            console.error("Error deleting slot:", error);
        }
    };

    // --- FILE UPLOAD HANDLER ---
    const handleFileUpload = async (e, setUrlCallback) => {
        const file = e.target.files[0];
        if (!file) return;

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "pumato");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dykcjfxx5/image/upload", {
                method: "POST",
                body: data
            });
            const result = await res.json();
            if (result.secure_url) {
                setUrlCallback(result.secure_url);
            } else {
                alert("Upload failed: " + (result.error?.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Upload error", err);
            alert("Upload failed");
        }
    };


    // Loading / Auth guards
    if (authLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="animate-spin text-orange-500" />
                    <p className="text-gray-400 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white pb-40 overflow-x-hidden">
            {/* Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* Background Glows */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-orange-900/20 rounded-full blur-[120px] pointer-events-none" />

            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10">

                {/* Header & Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white text-sm font-medium transition-colors"><ArrowLeft size={16} className="mr-2" /> Back to Store</Link>
                            <button
                                onClick={logout}
                                className="inline-flex items-center text-gray-400 hover:text-red-400 text-sm font-medium transition-colors gap-1"
                            >
                                <LogOut size={14} /> Logout
                            </button>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Admin Dashboard</h1>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-md min-w-max">
                            <button
                                onClick={() => setActiveSection("restaurants")}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "restaurants" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Utensils size={16} /> Restaurants
                            </button>
                            <button
                                onClick={() => setActiveSection("delivery")}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "delivery" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Truck size={16} /> Delivery
                            </button>
                            <button
                                onClick={() => setActiveSection("grocery")}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "grocery" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <ShoppingCart size={16} /> Grocery
                            </button>
                            <button
                                onClick={() => setActiveSection("laundry")}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "laundry" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Clock size={16} /> Laundry
                            </button>
                            <button
                                onClick={() => setActiveSection("settings")}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "settings" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Settings size={16} /> Global
                            </button>
                            <button
                                onClick={() => setActiveSection("coupons")}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "coupons" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Tag size={16} /> Promo Codes
                            </button>
                            <button
                                onClick={() => setActiveSection("banners")}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "banners" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Sparkles size={16} /> Banners
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- CONTENT SECTIONS --- */}
                <div className="min-h-[500px]">
                    {activeSection === "restaurants" && (
                        <RestaurantsTab
                            restaurants={restaurants}
                            fetchData={fetchData}
                        />
                    )}

                    {activeSection === "coupons" && (
                        <CouponsTab
                            coupons={coupons}
                            restaurants={restaurants}
                            fetchData={fetchData}
                            user={user}
                        />
                    )}

                    {activeSection === "delivery" && (
                        <DeliverySettings
                            orderSettings={orderSettings}
                            setOrderSettings={setOrderSettings}
                            restaurants={restaurants}
                        />
                    )}

                    {activeSection === "grocery" && (
                        <GrocerySettings
                            grocerySettings={grocerySettings}
                            setGrocerySettings={setGrocerySettings}
                            format12h={format12h}
                        />
                    )}

                    {activeSection === "laundry" && (
                        <LaundrySettings
                            laundrySlots={laundrySlots}
                            selectedDay={selectedDay}
                            setSelectedDay={setSelectedDay}
                            slotStart={slotStart}
                            setSlotStart={setSlotStart}
                            slotEnd={slotEnd}
                            setSlotEnd={setSlotEnd}
                            handleAddSlot={handleAddSlot}
                            handleDeleteSlot={handleDeleteSlot}
                            campusConfig={campusConfig}
                            setCampusConfig={setCampusConfig}
                            laundryPricing={laundryPricing}
                            setLaundryPricing={setLaundryPricing}
                            onSaveSettings={saveCampusConfig}
                        />
                    )}

                    {activeSection === "settings" && (
                        <GlobalSettings
                            orderSettings={orderSettings}
                            setOrderSettings={setOrderSettings}
                            grocerySettings={grocerySettings}
                            setGrocerySettings={setGrocerySettings}
                            handleFileUpload={handleFileUpload}
                        />
                    )}

                    {activeSection === "banners" && (
                        <BannersTab
                            banners={banners}
                            setBanners={setBanners}
                            handleFileUpload={handleFileUpload}
                        />
                    )}
                </div>
            </div>

            {/* Sticky Action Bar for Global Settings Sections */}
            {(activeSection === "delivery" || activeSection === "grocery" || activeSection === "settings" || activeSection === "banners" || activeSection === "laundry") && (
                <StickyActionBar
                    onSave={
                        activeSection === "banners" ? handleSaveBanners :
                            activeSection === "laundry" ? saveCampusConfig :
                                handleSaveSettings
                    }
                    onCancel={() => fetchData()}
                    isSaving={isSaving}
                    title={
                        activeSection === "delivery" ? "Delivery Settings" :
                            activeSection === "grocery" ? "Grocery Settings" :
                                activeSection === "laundry" ? "Managing Laundry Slots & Charges" :
                                    activeSection === "banners" ? "Managing Promo Banners" :
                                        "Global Settings"
                    }
                    saveLabel={activeSection === "laundry" ? "Save Config" : "Save Settings"}
                />
            )}

        </div>
    );
}
