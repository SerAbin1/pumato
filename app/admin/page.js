"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { Plus, Trash, Save, Tag, Utensils, Eye, EyeOff, Upload, LogOut, ArrowLeft, Clock, Calendar, Sparkles, Loader2, X, Search, ChevronUp, ChevronDown, Settings, Phone, Power } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where } from "firebase/firestore";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import Image from "next/image";
import Fuse from "fuse.js";

import { toTitleCase } from "@/lib/formatters";

const format12h = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

export default function AdminPage() {
    const router = useRouter();
    const { user, isAdmin, loading: authLoading, logout } = useAdminAuth();

    const [activeSection, setActiveSection] = useState("restaurants"); // restaurants, coupons, laundry
    const [restaurants, setRestaurants] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [banners, setBanners] = useState({
        banner1: { title: "50% OFF", sub: "Welcome Bonus", hidden: false },
        banner2: { title: "Free Delivery", sub: "On all orders", hidden: false },
        banner3: { title: "Tasty Deals", sub: "Flat ₹100 Off", hidden: false }
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("list"); // list, form
    const [editingId, setEditingId] = useState(null);
    const [menuSearchQuery, setMenuSearchQuery] = useState("");

    // Laundry Slots State
    const [selectedDay, setSelectedDay] = useState("default");
    const [laundrySlots, setLaundrySlots] = useState([]);
    const [slotStart, setSlotStart] = useState("");
    const [slotEnd, setSlotEnd] = useState("");
    const [campusConfig, setCampusConfig] = useState(DEFAULT_CAMPUS_CONFIG);

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

    // Restaurant Form State
    const [formData, setFormData] = useState({
        name: "", image: "", cuisine: "", deliveryTime: "30 mins", offer: "", priceForTwo: "",
        baseDeliveryCharge: "30", extraItemThreshold: "3", extraItemCharge: "10", minOrderAmount: "0",
        isVisible: true,
        isAvailable: true,
        menu: []
    });

    // Coupon Form State
    const [couponForm, setCouponForm] = useState({
        code: "", type: "FLAT", value: "", minOrder: "0", description: "", isVisible: true, isActive: true, usageLimit: "",
        restaurantId: null, itemId: null
    });
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [lightItemSearchQuery, setLightItemSearchQuery] = useState("");
    const [heavyItemSearchQuery, setHeavyItemSearchQuery] = useState("");
    const [couponTargetType, setCouponTargetType] = useState("item"); // item, category

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

            // If we are currently in a slot, we need to know WHEN this slot started to compare with hiddenAt
            // Strategy: If hiddenAt < today's slot start time, unhide it.
            // Simplified Strategy: If hiddenAt is not from "today's current active session", unhide.
            // Even simpler: If hiddenAt date is before today, unhide. If hiddenAt is today but before current slot start, unhide.

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

                        // Check if it was hidden in a slot that has ENDED.
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
                                const [eH, eM] = (activeSlot.end || "23:59").split(":").map(Number);
                                const slotStartMins = sH * 60 + sM; // Correct calculation

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
            if (docSnap.exists() && docSnap.data().campuses) {
                setCampusConfig(docSnap.data().campuses);
            } else {
                setCampusConfig(DEFAULT_CAMPUS_CONFIG);
            }
        } catch (error) {
            console.error("Error fetching campus config:", error);
        }
    };

    const saveCampusConfig = async () => {
        try {
            await setDoc(doc(db, "general_settings", "laundry"), {
                campuses: campusConfig
            });
            alert("Campus settings saved!");
        } catch (error) {
            console.error("Error saving campus config:", error);
            alert("Failed to save settings.");
        }
    };

    // --- LAUNDRY HANDLERS ---
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
            // Sort by start time comparison logic (simplified)
            // Extract HH:MM AM/PM part and compare
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
            await setDoc(doc(db, "laundry_slots", targetDoc), {
                slots: updatedSlots
            });
        } catch (error) {
            console.error("Error deleting slot:", error);
        }
    };




    // --- BANNER HANDLERS ---
    const handleSaveBanners = async () => {
        try {
            await setDoc(doc(db, "site_content", "promo_banners"), banners);
            alert("Banners updated successfully!");
        } catch (error) {
            console.error("Error saving banners:", error);
            alert("Failed to update banners");
        }
    };

    const handleSaveSettings = async () => {
        try {
            await Promise.all([
                setDoc(doc(db, "site_content", "order_settings"), orderSettings),
                setDoc(doc(db, "site_content", "grocery_settings"), grocerySettings)
            ]);
            alert("Settings updated successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to update settings");
        }
    };



    // --- RESTAURANT HANDLERS ---
    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            name: "", image: "", cuisine: "", deliveryTime: "30 mins", offer: "", priceForTwo: "",
            baseDeliveryCharge: "30", extraItemThreshold: "3", extraItemCharge: "10", minOrderAmount: "0",
            isVisible: true,
            categories: [],
            menu: []
        });
        setActiveTab("form");
        setMenuSearchQuery("");
    };

    const handleEdit = (restaurant) => {
        setEditingId(restaurant.id);
        setFormData({
            ...restaurant,
            categories: restaurant.categories || [],
            outOfStockCategories: restaurant.outOfStockCategories || [],
            isVisible: restaurant.isVisible !== false,
            isAvailable: restaurant.isAvailable !== false
        });
        setActiveTab("form");
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this restaurant?")) return;
        try {
            await deleteDoc(doc(db, "restaurants", id));
            await fetchData();
        } catch (error) {
            console.error(error);
            alert("Failed to delete");
        }
    };

    const handleSubmitRestaurant = async () => {
        const id = editingId || Date.now().toString();
        const formattedData = {
            ...formData,
            id,
            name: (formData.name || "").toUpperCase(),
            cuisine: toTitleCase(formData.cuisine || ""),
            menu: (formData.menu || []).map(item => ({
                ...item,
                name: toTitleCase(item.name || ""),
                category: (item.category || "").toUpperCase()
            }))
        };

        try {
            await setDoc(doc(db, "restaurants", id), formattedData);
            await fetchData();
            setActiveTab("list");
        } catch (error) {
            console.error(error);
            alert("Failed to save");
        }
    };

    // --- MENU HANDLERS ---
    const addMenuItem = () => {
        setFormData({ ...formData, menu: [...(formData.menu || []), { id: Date.now().toString(), name: "", price: "", description: "", image: "", isVeg: null, isVisible: true, category: "" }] });
    };

    const updateMenuItem = (index, field, value) => {
        const newMenu = [...formData.menu];
        if (field === "isVisible" && value === false) {
            // Saving hiddenAt timestamp for auto-revert logic
            newMenu[index].hiddenAt = new Date().toISOString();
        } else if (field === "isVisible" && value === true) {
            newMenu[index].hiddenAt = null;
        }
        newMenu[index][field] = value;
        setFormData({ ...formData, menu: newMenu });
    };

    const removeMenuItem = (index) => {
        const newMenu = formData.menu.filter((_, i) => i !== index);
        setFormData({ ...formData, menu: newMenu });
    };

    // --- COUPON HANDLERS ---
    const handleToggleActive = async (e, coupon) => {
        e.stopPropagation();
        const newStatus = !(coupon.isActive !== false); // Toggle

        // Optimistic update
        setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: newStatus } : c));

        const payload = {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            minOrder: coupon.minOrder,
            description: coupon.description,
            isVisible: coupon.isVisible,
            isActive: newStatus,
            usageLimit: coupon.usageLimit,
            usedCount: coupon.usedCount,
            restaurantId: coupon.restaurantId,
            itemId: coupon.itemId
        };

        try {
            const idToken = await user.getIdToken();
            const { error } = await supabase.functions.invoke("manage-coupons", {
                body: { action: "UPDATE", payload },
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (error) {
                // Revert on error
                setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !newStatus } : c));
                throw error;
            }
        } catch (error) {
            console.error(error);
            alert("Failed to toggle status");
        }
    };

    const handleAddNewCoupon = () => {
        setEditingId(null);
        setCouponForm({ code: "", type: "FLAT", value: "", minOrder: "0", description: "", isVisible: true, isActive: true, usageLimit: "", restaurantId: null, itemId: null });
        setCouponTargetType("item");
        setItemSearchQuery("");
        setActiveTab("form");
    };

    const handleEditCoupon = (coupon) => {
        setEditingId(coupon.id);
        const targetId = coupon.itemId || coupon.item_id;
        const isCategory = String(targetId).startsWith("CATEGORY:");
        setCouponTargetType(isCategory ? "category" : "item");
        setCouponForm({
            code: coupon.code || "",
            type: coupon.type || "FLAT",
            value: coupon.value || "",
            minOrder: coupon.minOrder || coupon.min_order || "0",
            description: coupon.description || "",
            isVisible: coupon.isVisible !== undefined ? coupon.isVisible : (coupon.is_visible !== undefined ? coupon.is_visible : true),
            isActive: coupon.isActive !== undefined ? coupon.isActive : (coupon.is_active !== undefined ? coupon.is_active : true),
            usageLimit: coupon.usageLimit || coupon.usage_limit || "",
            usedCount: coupon.usedCount || coupon.used_count || 0,
            restaurantId: coupon.restaurantId || coupon.restaurant_id || null,
            itemId: targetId || null
        });
        setActiveTab("form");
    };

    const handleDeleteCoupon = async (id) => {
        if (!confirm("Delete this coupon?")) return;
        try {
            const idToken = await user.getIdToken();
            const { error } = await supabase.functions.invoke("manage-coupons", {
                body: { action: "DELETE", payload: { id } },
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error(error);
            alert("Failed to delete from Supabase");
        }
    };

    const handleSubmitCoupon = async () => {
        const limit = parseInt(couponForm.usageLimit);
        if (!limit || limit < 1) {
            alert("Usage limit is required and must be at least 1.");
            return;
        }

        // BOGO & B2G1 Validation
        if ((couponForm.type === 'BOGO' || couponForm.type === 'B2G1') && (!couponForm.restaurantId || !couponForm.itemId)) {
            alert("Restaurant and Item are required for Buy X Get Y offers.");
            return;
        }

        const id = editingId || couponForm.code.toUpperCase();
        const payload = {
            id,
            code: couponForm.code.toUpperCase(),
            type: couponForm.type,
            value: (couponForm.type === 'BOGO' || couponForm.type === 'B2G1') ? 0 : (couponForm.value || 0),
            minOrder: couponForm.minOrder || 0,
            description: couponForm.description,
            isVisible: couponForm.isVisible,
            isActive: couponForm.isActive !== false,
            usageLimit: limit,
            usedCount: editingId ? (couponForm.usedCount || 0) : 0,
            restaurantId: couponForm.restaurantId || null,
            itemId: couponForm.itemId || null
        };

        try {
            console.log("Submitting coupon payload:", payload);
            const idToken = await user.getIdToken();
            const { error } = await supabase.functions.invoke("manage-coupons", {
                body: { action: editingId ? "UPDATE" : "CREATE", payload },
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (error) throw error;
            await fetchData();
            setActiveTab("list");
        } catch (error) {
            console.error(error);
            alert("Failed to save to Supabase");
        }
    };

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


    // Show loading state while checking auth
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

    // Don't render if not authenticated (will redirect)
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
                                onClick={() => { setActiveSection("restaurants"); setActiveTab("list"); }}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "restaurants" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Utensils size={16} /> Restaurants
                            </button>
                            <button
                                onClick={() => { setActiveSection("coupons"); setActiveTab("list"); }}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "coupons" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Tag size={16} /> Promo Codes
                            </button>
                            <button
                                onClick={() => { setActiveSection("laundry"); setActiveTab("list"); }}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "laundry" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Clock size={16} /> Laundry
                            </button>
                            <button
                                onClick={() => { setActiveSection("banners"); setActiveTab("list"); }}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "banners" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Sparkles size={16} /> Banners
                            </button>
                            <button
                                onClick={() => { setActiveSection("settings"); setActiveTab("list"); }}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "settings" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <Settings size={16} /> Settings
                            </button>
                        </div>
                    </div>
                    {activeSection !== 'laundry' && activeSection !== 'banners' && activeSection !== 'categories' && (
                        <button
                            onClick={() => activeTab === "list" ? (activeSection === "restaurants" ? handleAddNew() : handleAddNewCoupon()) : setActiveTab("list")}
                            className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-orange-900/40 hover:bg-orange-500 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            {activeTab === "list" ? <><Plus size={20} /> Add New</> : "Back to List"}
                        </button>
                    )}
                </div>

                {/* --- RESTAURANTS SECTION --- */}
                {activeSection === "restaurants" && (
                    activeTab === "list" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {restaurants.map(r => (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={r.id}
                                    className={`bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all group hover:border-white/20 hover:shadow-2xl hover:shadow-orange-900/10 ${r.isVisible === false ? 'opacity-60' : ''}`}
                                >
                                    <div className="relative h-56 mb-6 overflow-hidden rounded-2xl bg-black">
                                        {r.image && (
                                            <Image
                                                src={r.image}
                                                alt={r.name}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 400px"
                                                className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                            />
                                        )}
                                        {r.isVisible === false && (
                                            <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1">
                                                <EyeOff size={12} /> Hidden
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const updated = { ...r, isVisible: r.isVisible === false ? true : false };
                                                    try {
                                                        await setDoc(doc(db, "restaurants", r.id), updated);
                                                        await fetchData();
                                                    } catch (error) {
                                                        console.error(error);
                                                        alert("Failed to toggle visibility");
                                                    }
                                                }}
                                                className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-purple-600 hover:text-white text-white transition-all"
                                                title={r.isVisible === false ? "Show Restaurant" : "Hide Restaurant"}
                                            >
                                                {r.isVisible === false ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }} className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-blue-600 hover:text-white text-white transition-all"><Save size={18} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-red-600 hover:text-white text-white transition-all"><Trash size={18} /></button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-2xl text-white mb-1">{r.name}</h3>
                                    <p className="text-gray-400 text-sm mb-6">{r.cuisine}</p>
                                    <button onClick={() => handleEdit(r)} className="w-full py-4 rounded-xl border border-white/10 text-gray-300 font-bold hover:bg-white hover:text-black transition-all">Edit Details</button>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-5xl mx-auto shadow-2xl">
                            <h2 className="text-3xl font-black mb-10 text-white border-b border-white/10 pb-6">{editingId ? "Edit Restaurant" : "Create New Restaurant"}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <FormInput label="Restaurant Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Image URL</label>
                                    <div className="flex gap-2">
                                        <input className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
                                        <label className="bg-white/10 hover:bg-white/20 p-4 rounded-xl cursor-pointer text-white transition-colors">
                                            <Upload size={24} />
                                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setFormData(prev => ({ ...prev, image: url })))} />
                                        </label>
                                    </div>
                                </div>
                                <FormInput label="Cuisine" value={formData.cuisine} onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })} />
                                <FormInput label="Delivery Time" value={formData.deliveryTime} onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })} />
                                <FormInput label="Offer Badge" value={formData.offer} onChange={(e) => setFormData({ ...formData, offer: e.target.value })} placeholder="e.g 50% OFF" />
                                <FormInput label="Extra Info / Offer" value={formData.priceForTwo} onChange={(e) => setFormData({ ...formData, priceForTwo: e.target.value })} placeholder="e.g. Buy 1 Get 1 Free" />

                                <div className="col-span-full grid grid-cols-1 md:grid-cols-4 gap-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <FormInput label="Base Del. Charge (₹)" type="number" value={formData.baseDeliveryCharge} onChange={(e) => setFormData({ ...formData, baseDeliveryCharge: e.target.value })} />
                                    <FormInput label="Extra Item Threshold" type="number" value={formData.extraItemThreshold} onChange={(e) => setFormData({ ...formData, extraItemThreshold: e.target.value })} />
                                    <FormInput label="Extra Charge (₹)" type="number" value={formData.extraItemCharge} onChange={(e) => setFormData({ ...formData, extraItemCharge: e.target.value })} />
                                    <FormInput label="Min Order Amt (₹)" type="number" value={formData.minOrderAmount || "0"} onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })} placeholder="0" />
                                </div>

                                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Temporarily Closed Toggle */}
                                    <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                            <input
                                                type="checkbox"
                                                id="restaurant-visibility"
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                                                checked={formData.isVisible !== false}
                                                onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                                                style={{ right: formData.isVisible !== false ? '0' : 'auto', left: formData.isVisible !== false ? 'auto' : '0' }}
                                            />
                                            <label htmlFor="restaurant-visibility" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isVisible !== false ? 'bg-green-500' : 'bg-gray-600'}`}></label>
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="restaurant-visibility" className="text-sm font-bold text-white cursor-pointer select-none flex items-center gap-2">
                                                {formData.isVisible !== false ? <Clock size={18} className="text-green-400" /> : <Clock size={18} className="text-red-400" />}
                                                Open for Orders
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">Status: {formData.isVisible !== false ? "OPEN" : "TEMPORARILY CLOSED"}</p>
                                        </div>
                                    </div>

                                    {/* Database Availability Toggle */}
                                    <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-red-500/10">
                                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                            <input
                                                type="checkbox"
                                                id="restaurant-availability"
                                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                                                checked={formData.isAvailable !== false}
                                                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                                                style={{ right: formData.isAvailable !== false ? '0' : 'auto', left: formData.isAvailable !== false ? 'auto' : '0' }}
                                            />
                                            <label htmlFor="restaurant-availability" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isAvailable !== false ? 'bg-blue-500' : 'bg-gray-600'}`}></label>
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="restaurant-availability" className="text-sm font-bold text-white cursor-pointer select-none flex items-center gap-2">
                                                {formData.isAvailable !== false ? <Eye size={18} className="text-blue-400" /> : <EyeOff size={18} className="text-gray-400" />}
                                                Account Active
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">{formData.isAvailable !== false ? "Visible in search and lists" : "HIDDEN from all users"}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Category Management */}
                            <div className="border-t border-white/10 pt-10 mb-10">
                                <h3 className="font-bold text-2xl text-white mb-6">Restaurant Categories</h3>
                                <div className="flex gap-4 mb-6">
                                    <input
                                        className="flex-1 p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                                        placeholder="Add Custom Category for this Restaurant"
                                        id="local-cat-input"
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById("local-cat-input");
                                            if (input && input.value.trim()) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    categories: [...(prev.categories || []), input.value.trim()]
                                                }));
                                                input.value = "";
                                            }
                                        }}
                                        className="bg-orange-600 text-white px-8 rounded-xl font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-900/40"
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(formData.categories || []).map(cat => {
                                        const isOutOfStock = (formData.outOfStockCategories || []).includes(cat);
                                        return (
                                            <div key={cat} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all group ${isOutOfStock ? 'bg-red-500/20 border-red-500/30' : 'bg-white/10 border-white/10 hover:border-white/30'}`}>
                                                <button
                                                    onClick={() => {
                                                        setFormData(prev => {
                                                            const outOfStock = prev.outOfStockCategories || [];
                                                            return {
                                                                ...prev,
                                                                outOfStockCategories: isOutOfStock
                                                                    ? outOfStock.filter(c => c !== cat)
                                                                    : [...outOfStock, cat]
                                                            };
                                                        });
                                                    }}
                                                    className={`text-xs font-bold px-2 py-0.5 rounded ${isOutOfStock ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-orange-500 hover:text-white'}`}
                                                    title={isOutOfStock ? "Mark as Available" : "Mark as Out of Stock"}
                                                >
                                                    {isOutOfStock ? "OUT" : "IN"}
                                                </button>
                                                <span className={`text-sm font-bold ${isOutOfStock ? 'text-red-400 line-through' : 'text-gray-200'}`}>{cat}</span>
                                                <button
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            categories: (prev.categories || []).filter(c => c !== cat),
                                                            outOfStockCategories: (prev.outOfStockCategories || []).filter(c => c !== cat)
                                                        }));
                                                    }}
                                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 mt-4 italic">
                                    * Click IN/OUT to toggle category availability. OUT categories hide all items in that section.
                                </p>
                            </div>

                            <div className="border-t border-white/10 pt-10">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-2xl text-white">Menu Management</h3>
                                </div>

                                {/* Search Bar */}
                                <div className="mb-6 relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search menu items by name..."
                                        value={menuSearchQuery}
                                        onChange={(e) => setMenuSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium placeholder-gray-500"
                                    />
                                    {menuSearchQuery && (
                                        <button
                                            onClick={() => setMenuSearchQuery("")}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>

                                {/* Item Count */}
                                {(formData.menu || []).length > 0 && (
                                    <div className="mb-4 text-sm text-gray-400 font-medium">
                                        {(() => {
                                            const menu = formData.menu || [];
                                            if (!menuSearchQuery) return `Showing ${menu.length} of ${menu.length} items`;

                                            const fuse = new Fuse(menu, {
                                                keys: ['name'],
                                                threshold: 0.3,
                                                includeScore: true
                                            });
                                            const results = fuse.search(menuSearchQuery);

                                            // Also include exact substring matches
                                            const query = menuSearchQuery.toLowerCase();
                                            const substringMatches = menu.filter(item =>
                                                item.name.toLowerCase().includes(query)
                                            );

                                            // Combine and deduplicate
                                            const allMatches = [...results.map(r => r.item)];
                                            substringMatches.forEach(item => {
                                                if (!allMatches.find(m => m.id === item.id)) {
                                                    allMatches.push(item);
                                                }
                                            });

                                            return `Showing ${allMatches.length} of ${menu.length} items`;
                                        })()}
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {(() => {
                                        const menu = formData.menu || [];
                                        if (!menuSearchQuery) return menu;

                                        const query = menuSearchQuery.toLowerCase().trim();
                                        const fuse = new Fuse(menu, {
                                            keys: ['name'],
                                            threshold: 0.3,
                                            includeScore: true
                                        });
                                        const results = fuse.search(menuSearchQuery);

                                        // Boost scores for exact matches
                                        const scoredResults = results.map(result => {
                                            const itemName = result.item.name.toLowerCase();
                                            let adjustedScore = result.score;
                                            if (itemName === query) adjustedScore -= 0.5;
                                            else if (itemName.startsWith(query)) adjustedScore -= 0.3;
                                            else if (itemName.includes(query)) adjustedScore -= 0.2;
                                            return { item: result.item, score: adjustedScore };
                                        });

                                        // Also include exact substring matches that Fuse might have missed
                                        const substringMatches = menu.filter(item => {
                                            const itemName = item.name.toLowerCase();
                                            return itemName.includes(query) && !scoredResults.find(r => r.item.id === item.id);
                                        });

                                        const allMatches = [
                                            ...scoredResults,
                                            ...substringMatches.map(item => ({ item, score: 0 }))
                                        ];

                                        allMatches.sort((a, b) => (a.score || 1) - (b.score || 1));
                                        return allMatches.map(m => m.item);
                                    })().map((item, idx) => {
                                        const actualIdx = (formData.menu || []).indexOf(item);
                                        return (
                                            <div key={item.id} className={`p-6 border border-white/10 rounded-3xl bg-black/20 relative group ${item.isVisible === false ? 'opacity-60' : ''}`}>
                                                <button onClick={() => removeMenuItem(actualIdx)} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"><Trash size={16} /></button>
                                                <button
                                                    onClick={() => updateMenuItem(actualIdx, "isVisible", item.isVisible === false ? true : false)}
                                                    className="absolute -top-3 -left-3 bg-purple-500 text-white p-2 rounded-full hover:bg-purple-600 transition-colors shadow-lg"
                                                    title={item.isVisible === false ? "Show Item" : "Hide Item"}
                                                >
                                                    {item.isVisible === false ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                {item.isVisible === false && (
                                                    <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur-md text-white px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg z-10">
                                                        Hidden
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                    <div className="col-span-1 space-y-4">
                                                        <input className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white font-bold" placeholder="Item Name" value={item.name} onChange={(e) => updateMenuItem(actualIdx, "name", e.target.value)} />
                                                        <input className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white" placeholder="Price" type="number" value={item.price} onChange={(e) => updateMenuItem(actualIdx, "price", e.target.value)} />
                                                        <input className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white text-xs" placeholder="Extra Info (e.g. Must Try)" value={item.extraInfo || ""} onChange={(e) => updateMenuItem(actualIdx, "extraInfo", e.target.value)} />
                                                        <select
                                                            className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white text-xs appearance-none focus:outline-none focus:border-orange-500/50"
                                                            value={item.category || ""}
                                                            onChange={(e) => updateMenuItem(actualIdx, "category", e.target.value)}
                                                        >
                                                            <option value="" disabled className="bg-gray-900 text-gray-400">Select Category</option>
                                                            {(formData.categories || []).map(cat => (
                                                                <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                                                            ))}
                                                            {item.category && !(formData.categories || []).includes(item.category) && (
                                                                <option value={item.category} className="bg-gray-900">{item.category} (Legacy)</option>
                                                            )}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <textarea className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white h-full resize-none min-h-[100px]" placeholder="Description" value={item.description} onChange={(e) => updateMenuItem(actualIdx, "description", e.target.value)} />
                                                    </div>
                                                    <div className="col-span-1 space-y-4">
                                                        <div className="flex gap-2">
                                                            <input className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white text-xs" placeholder="Image URL" value={item.image} onChange={(e) => updateMenuItem(actualIdx, "image", e.target.value)} />
                                                            <label className="bg-white/10 hover:bg-white/20 p-2 rounded-lg cursor-pointer text-white transition-colors flex items-center justify-center min-w-[40px]">
                                                                <Upload size={16} />
                                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (url) => updateMenuItem(actualIdx, "image", url))} />
                                                            </label>
                                                        </div>
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.isVeg === true}
                                                                    onChange={(e) => {
                                                                        const val = e.target.checked;
                                                                        updateMenuItem(actualIdx, "isVeg", val ? true : null);
                                                                    }}
                                                                    id={`veg-${actualIdx}`}
                                                                    className="w-5 h-5 accent-green-500 rounded"
                                                                />
                                                                <label htmlFor={`veg-${actualIdx}`} className="text-sm font-bold text-green-400">Pure Veg</label>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.isVeg === false}
                                                                    onChange={(e) => {
                                                                        const val = e.target.checked;
                                                                        updateMenuItem(actualIdx, "isVeg", val ? false : null);
                                                                    }}
                                                                    id={`nonveg-${actualIdx}`}
                                                                    className="w-5 h-5 accent-red-500 rounded"
                                                                />
                                                                <label htmlFor={`nonveg-${actualIdx}`} className="text-sm font-bold text-red-500">Non-Veg</label>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="mt-12 pt-8 border-t border-white/10 flex justify-end gap-4 opacity-0 pointer-events-none">
                                <button onClick={() => setActiveTab("list")} className="px-8 py-4 rounded-2xl font-bold text-gray-400">Cancel</button>
                                <button className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold">Update</button>
                            </div>
                        </div>
                    )
                )}

                {/* --- COUPONS SECTION --- */}
                {activeSection === "coupons" && (
                    activeTab === "list" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {coupons.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => handleEditCoupon(c)}
                                    className="bg-white/5 p-8 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all relative group hover:shadow-xl cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border border-orange-500/30">{c.type}</div>
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-2 tracking-tight">{c.code}</h3>
                                    <p className="text-gray-400 text-sm mb-6 font-medium">{c.description}</p>

                                    <div className="flex items-center justify-between text-sm font-bold text-gray-300 bg-black/30 p-4 rounded-xl border border-white/5">
                                        <span>Value: {c.type === 'FLAT' ? `₹${c.value}` : `${c.value}%`}</span>
                                        <span>Min: ₹{c.minOrder}</span>
                                        {c.usageLimit > 0 && (
                                            <span className={`${(c.usedCount || 0) >= c.usageLimit ? 'text-red-400' : 'text-cyan-400'}`}>
                                                Used: {c.usedCount || 0}/{c.usageLimit}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-2xl mx-auto shadow-2xl">
                            <h2 className="text-3xl font-black mb-10 text-white border-b border-white/10 pb-6">{editingId ? "Edit Promo Code" : "Create New Promo Code"}</h2>

                            <div className="space-y-8">
                                <FormInput label="Coupon Code" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME50" />

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Discount Type</label>
                                        <div className="relative">
                                            <select className="appearance-none p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium" value={couponForm.type} onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}>
                                                <option value="FLAT" className="bg-gray-900">Flat Amount (₹)</option>
                                                <option value="PERCENTAGE" className="bg-gray-900">Percentage (%)</option>
                                                <option value="BOGO" className="bg-gray-900">Buy 1 Get 1 (BOGO)</option>
                                                <option value="B2G1" className="bg-gray-900">Buy 2 Get 1 Free</option>
                                            </select>
                                        </div>
                                    </div>
                                    {!['BOGO', 'B2G1'].includes(couponForm.type) ? (
                                        <FormInput label="Discount Value" type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} placeholder="50" />
                                    ) : (
                                        <div className="space-y-3 opacity-50">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Discount Value</label>
                                            <div className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white/40 font-medium text-sm italic">
                                                Calculated Automatically
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Item-Specific Configuration */}
                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                            <Utensils size={18} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Target Item (Optional)</h3>
                                    </div>
                                    <p className="text-gray-400 text-sm pl-13">Link this coupon to a specific item. {couponForm.type === 'BOGO' ? <span className="text-orange-400 font-bold">REQUIRED for BOGO.</span> : "Leave blank for a global discount."}</p>

                                    <div className="space-y-6 pl-13">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Step 1: Select Restaurant</label>
                                            <select
                                                className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                                value={couponForm.restaurantId || ""}
                                                onChange={(e) => {
                                                    setCouponForm({ ...couponForm, restaurantId: e.target.value, itemId: null });
                                                    setCouponTargetType("item");
                                                    setItemSearchQuery("");
                                                }}
                                            >
                                                <option value="" className="bg-gray-900">All Restaurants (Global Coupon)</option>
                                                {restaurants.map(r => (
                                                    <option key={r.id} value={r.id} className="bg-gray-900">{r.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {couponForm.restaurantId && (
                                            <div className="space-y-6 pt-4 border-t border-white/5">
                                                <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 gap-2">
                                                    <button
                                                        onClick={() => { setCouponTargetType("item"); setCouponForm({ ...couponForm, itemId: null }); }}
                                                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${couponTargetType === 'item' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                                    >
                                                        Specific Item
                                                    </button>
                                                    <button
                                                        onClick={() => { setCouponTargetType("category"); setCouponForm({ ...couponForm, itemId: null }); }}
                                                        className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${couponTargetType === 'category' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                                    >
                                                        Entire Category
                                                    </button>
                                                </div>

                                                {couponTargetType === "item" ? (
                                                    <div className="space-y-4">
                                                        <div className="relative group">
                                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                                                            <input
                                                                type="text"
                                                                placeholder="Search item name..."
                                                                value={itemSearchQuery}
                                                                onChange={(e) => setItemSearchQuery(e.target.value)}
                                                                className="w-full bg-black/20 border border-white/10 pl-11 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                                            {(() => {
                                                                const menu = (restaurants.find(r => r.id === couponForm.restaurantId)?.menu || []);
                                                                if (!itemSearchQuery) return menu;

                                                                const query = itemSearchQuery.toLowerCase().trim();
                                                                const fuse = new Fuse(menu, {
                                                                    keys: ['name'],
                                                                    threshold: 0.3,
                                                                    includeScore: true
                                                                });
                                                                const results = fuse.search(itemSearchQuery);

                                                                // Boost scores for exact matches
                                                                const scoredResults = results.map(result => {
                                                                    const itemName = result.item.name.toLowerCase();
                                                                    let adjustedScore = result.score;
                                                                    if (itemName === query) adjustedScore -= 0.5;
                                                                    else if (itemName.startsWith(query)) adjustedScore -= 0.3;
                                                                    else if (itemName.includes(query)) adjustedScore -= 0.2;
                                                                    return { item: result.item, score: adjustedScore };
                                                                });

                                                                // Include substring matches
                                                                const substringMatches = menu.filter(item => {
                                                                    const itemName = item.name.toLowerCase();
                                                                    return itemName.includes(query) && !scoredResults.find(r => r.item.id === item.id);
                                                                });

                                                                const allMatches = [
                                                                    ...scoredResults,
                                                                    ...substringMatches.map(item => ({ item, score: 0 }))
                                                                ];

                                                                allMatches.sort((a, b) => (a.score || 1) - (b.score || 1));
                                                                return allMatches.map(m => m.item);
                                                            })().map(item => (
                                                                <button
                                                                    key={item.id}
                                                                    onClick={() => setCouponForm({ ...couponForm, itemId: item.id })}
                                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${couponForm.itemId === item.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                                                >
                                                                    <span className="font-bold text-sm tracking-tight">{item.name}</span>
                                                                    <span className="text-xs font-medium opacity-60">₹{item.price}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Array.from(new Set(restaurants.find(r => r.id === couponForm.restaurantId)?.menu?.map(i => i.category) || []))
                                                            .map(cat => (
                                                                <button
                                                                    key={cat}
                                                                    onClick={() => setCouponForm({ ...couponForm, itemId: `CATEGORY:${cat}` })}
                                                                    className={`p-4 rounded-xl border transition-all text-center font-bold text-xs ${couponForm.itemId === `CATEGORY:${cat}` ? 'bg-orange-600/20 border-orange-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                                                >
                                                                    {cat || "General"}
                                                                </button>
                                                            ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <FormInput label="Min Order Amount (₹)" type="number" value={couponForm.minOrder} onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })} placeholder="0" />

                                <FormInput label="Usage Limit" type="number" value={couponForm.usageLimit} onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })} placeholder="e.g. 100" />

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                    <textarea placeholder="Brief description of the offer..." className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium h-32 resize-none" value={couponForm.description} onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })} />
                                </div>

                                <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input
                                            type="checkbox"
                                            name="toggle"
                                            id="toggle"
                                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                                            checked={couponForm.isVisible !== false}
                                            onChange={(e) => setCouponForm({ ...couponForm, isVisible: e.target.checked })}
                                            style={{ right: couponForm.isVisible !== false ? '0' : 'auto', left: couponForm.isVisible !== false ? 'auto' : '0' }}
                                        />
                                        <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${couponForm.isVisible !== false ? 'bg-orange-500' : 'bg-gray-600'}`}></label>
                                    </div>
                                    <label htmlFor="toggle" className="text-sm font-bold text-white cursor-pointer select-none">
                                        Show in Cart Quick Apply?
                                    </label>
                                </div>

                                <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input
                                            type="checkbox"
                                            name="toggle-active"
                                            id="toggle-active"
                                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                                            checked={couponForm.isActive !== false}
                                            onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                                            style={{ right: couponForm.isActive !== false ? '0' : 'auto', left: couponForm.isActive !== false ? 'auto' : '0' }}
                                        />
                                        <label htmlFor="toggle-active" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${couponForm.isActive !== false ? 'bg-green-500' : 'bg-gray-600'}`}></label>
                                    </div>
                                    <label htmlFor="toggle-active" className="text-sm font-bold text-white cursor-pointer select-none">
                                        Coupon Active? <span className="text-gray-500 font-normal">(If off, customers cannot apply)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/10 flex justify-end gap-4 opacity-0 pointer-events-none">
                                <button onClick={() => setActiveTab("list")} className="px-8 py-4 rounded-2xl font-bold text-gray-400">Cancel</button>
                                <button className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold">Update</button>
                            </div>
                        </div>
                    )
                )}

                {/* --- LAUNDRY SLOTS SECTION --- */}
                {activeSection === "laundry" && (
                    <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-4xl mx-auto shadow-2xl">
                        <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-6 flex items-center gap-3">
                            <Clock className="text-cyan-500" /> Laundry Timeslots Management
                        </h2>

                        <div className="grid md:grid-cols-2 gap-12">
                            {/* Day Selector */}
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['default', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/5 ${selectedDay === day ? 'bg-cyan-500 text-white shadow-lg' : 'bg-black/20 text-gray-500 hover:text-white hover:bg-white/10'}`}
                                        >
                                            {day === 'default' ? 'Default' : day.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-cyan-500/10 p-6 rounded-2xl border border-cyan-500/20 mb-6">
                                    <h4 className="text-xl font-bold text-cyan-400 mb-2">
                                        Managing: <span className="text-white underline decoration-cyan-500/50">{selectedDay === 'default' ? 'Default Schedule' : selectedDay}</span>
                                    </h4>
                                    <p className="text-cyan-200/70 text-sm">
                                        {selectedDay === 'default'
                                            ? "These slots apply to any day that doesn't have specific slots set."
                                            : `Slots added here will OVERRIDE the default schedule for all ${selectedDay}s.`}
                                    </p>
                                </div>


                                <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl">
                                    <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><Clock size={16} /> How it works</h4>
                                    <p className="text-sm text-blue-200/70 leading-relaxed">
                                        Add available pickup time slots for the selected date. These will appear in the Laundry booking form for users.
                                    </p>
                                </div>
                            </div>

                            {/* Slot Manager */}
                            <div className="space-y-6">
                                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Available Slots</label>

                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Start</label>
                                            <input
                                                type="time"
                                                value={slotStart}
                                                onChange={(e) => setSlotStart(e.target.value)}
                                                className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50 font-bold [color-scheme:dark]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">End</label>
                                            <input
                                                type="time"
                                                value={slotEnd}
                                                onChange={(e) => setSlotEnd(e.target.value)}
                                                className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50 font-bold [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddSlot}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white p-3.5 rounded-xl transition-colors font-bold shadow-lg shadow-cyan-900/40 h-[50px] w-[50px] flex items-center justify-center"
                                        title="Add Slot"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {laundrySlots.length === 0 && (
                                        <div className="text-center py-10 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                                            No slots added for this date.
                                        </div>
                                    )}
                                    {laundrySlots.map((slot, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                                            <span className="font-bold text-gray-200">{slot}</span>
                                            <button
                                                onClick={() => handleDeleteSlot(idx)}
                                                className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>


                            </div>
                        </div>

                        {/* Campus Delivery Charges */}
                        <div className="mt-12 pt-8 border-t border-white/10">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Tag size={20} className="text-cyan-500" /> Campus Delivery Charges
                                </h3>
                                <button
                                    onClick={saveCampusConfig}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
                                >
                                    <Save size={18} /> Save Settings
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {campusConfig.map((campus, idx) => (
                                    <div key={campus.id} className="bg-white/5 p-6 rounded-2xl border border-white/5">
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="text-lg font-bold text-white">{campus.name}</h4>
                                            <div className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg text-xs font-bold">
                                                {campus.id}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Delivery Charge (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={campus.deliveryCharge}
                                                onChange={(e) => {
                                                    const newConfig = [...campusConfig];
                                                    newConfig[idx].deliveryCharge = Math.max(0, Number(e.target.value));
                                                    setCampusConfig(newConfig);
                                                }}
                                                className="w-full bg-black/30 p-3 rounded-xl text-white font-bold border border-white/10 focus:border-cyan-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- BANNERS SECTION --- */}
                {activeSection === "banners" && (
                    <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-4xl mx-auto shadow-2xl">
                        <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-6 flex items-center gap-3">
                            <Sparkles className="text-yellow-500" /> Manage Promo Banners
                        </h2>

                        <div className="grid gap-8">
                            {[1, 2, 3].map(num => {
                                const bannerKey = `banner${num}`;
                                const banner = banners[bannerKey] || {};

                                return (
                                    <div key={num} className={`bg-black/30 p-6 rounded-2xl border border-white/10 relative overflow-hidden ${banner.hidden ? 'opacity-50' : ''}`}>
                                        <div className="absolute top-0 right-0 p-4 opacity-50 font-black text-6xl text-white/5 pointer-events-none">{num}</div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold text-gray-200 uppercase tracking-wider">Banner {num}</h3>
                                            <button
                                                onClick={() => setBanners({ ...banners, [bannerKey]: { ...banner, hidden: !banner.hidden } })}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${banner.hidden ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'}`}
                                                title={banner.hidden ? "Click to show banner" : "Click to hide banner"}
                                            >
                                                {banner.hidden ? <><EyeOff size={16} /> Hidden</> : <><Eye size={16} /> Visible</>}
                                            </button>
                                        </div>
                                        <div className="grid md:grid-cols-2 gap-6">
                                            <FormInput
                                                label="Title (e.g. 50% OFF)"
                                                value={banner.title || ""}
                                                onChange={(e) => setBanners({ ...banners, [bannerKey]: { ...banner, title: e.target.value } })}
                                            />
                                            <FormInput
                                                label="Subtitle (e.g. Welcome Bonus)"
                                                value={banner.sub || ""}
                                                onChange={(e) => setBanners({ ...banners, [bannerKey]: { ...banner, sub: e.target.value } })}
                                            />

                                            {/* Gradient Picker */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Background Style</label>
                                                <select
                                                    value={banner.gradient || ""}
                                                    onChange={(e) => setBanners({ ...banners, [bannerKey]: { ...banner, gradient: e.target.value } })}
                                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 appearance-none font-medium"
                                                >
                                                    <option value="from-blue-600 to-blue-900">Ocean Blue</option>
                                                    <option value="from-orange-500 to-red-600">Sunset Orange</option>
                                                    <option value="from-emerald-600 to-emerald-900">Forest Green</option>
                                                    <option value="from-purple-600 to-purple-900">Royal Purple</option>
                                                    <option value="from-pink-500 to-rose-500">Hot Pink</option>
                                                    <option value="from-gray-800 to-black">Midnight Black</option>
                                                </select>
                                            </div>

                                            {/* Image Upload */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Banner Image (Optional)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm"
                                                        value={banner.image || ""}
                                                        onChange={(e) => setBanners({ ...banners, [bannerKey]: { ...banner, image: e.target.value } })}
                                                        placeholder="Image URL..."
                                                    />
                                                    <label className="bg-white/10 hover:bg-white/20 p-4 rounded-xl cursor-pointer text-white transition-colors flex-shrink-0">
                                                        <Upload size={20} />
                                                        <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setBanners({ ...banners, [bannerKey]: { ...banner, image: url } }))} />
                                                    </label>
                                                    {banner.image && (
                                                        <button
                                                            onClick={() => setBanners({ ...banners, [bannerKey]: { ...banner, image: "" } })}
                                                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 p-4 rounded-xl border border-red-500/20 transition-colors"
                                                            title="Remove Image"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10 flex justify-end opacity-0 pointer-events-none">
                            <button className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold">Update</button>
                        </div>
                    </div>
                )}

                {/* SETTINGS SECTION */}
                {activeSection === "settings" && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                            <h2 className="text-3xl font-black text-white mb-8">Global Site Settings</h2>

                            <div className="max-w-2xl space-y-8">
                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                                                <Clock size={18} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Food Ordering Hours</h3>
                                        </div>
                                        <button
                                            onClick={() => setOrderSettings({ ...orderSettings, slots: [...(orderSettings.slots || []), { start: "18:30", end: "23:00" }] })}
                                            className="bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-orange-500/20 flex items-center gap-2"
                                        >
                                            <Plus size={14} /> Add Slot
                                        </button>
                                    </div>
                                    <p className="text-gray-400 text-sm pl-13">Define one or more time windows when customers can place food delivery orders.</p>

                                    <div className="space-y-4 pt-2">
                                        {(orderSettings.slots || []).map((slot, index) => (
                                            <div key={index} className="pl-13 flex flex-col md:flex-row gap-4 items-start md:items-end">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Start Time</label>
                                                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">{format12h(slot.start)}</span>
                                                    </div>
                                                    <input
                                                        type="time"
                                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-bold [color-scheme:dark]"
                                                        value={slot.start}
                                                        onChange={(e) => {
                                                            const newSlots = [...orderSettings.slots];
                                                            newSlots[index].start = e.target.value;
                                                            setOrderSettings({ ...orderSettings, slots: newSlots });
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">End Time</label>
                                                        <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">{format12h(slot.end)}</span>
                                                    </div>
                                                    <input
                                                        type="time"
                                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-bold [color-scheme:dark]"
                                                        value={slot.end}
                                                        onChange={(e) => {
                                                            const newSlots = [...orderSettings.slots];
                                                            newSlots[index].end = e.target.value;
                                                            setOrderSettings({ ...orderSettings, slots: newSlots });
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setOrderSettings({ ...orderSettings, slots: orderSettings.slots.filter((_, i) => i !== index) })}
                                                    className="p-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all flex-shrink-0"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        ))}

                                        <div className="pl-13 col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                                            <FormInput
                                                label="Global Base Del. Charge (₹)"
                                                type="number"
                                                value={orderSettings.baseDeliveryCharge || "30"}
                                                onChange={(e) => setOrderSettings({ ...orderSettings, baseDeliveryCharge: e.target.value })}
                                            />
                                            <FormInput
                                                label="Global Extra Threshold"
                                                type="number"
                                                value={orderSettings.extraItemThreshold || "3"}
                                                onChange={(e) => setOrderSettings({ ...orderSettings, extraItemThreshold: e.target.value })}
                                            />
                                            <FormInput
                                                label="Global Extra Charge (₹)"
                                                type="number"
                                                value={orderSettings.extraItemCharge || "10"}
                                                onChange={(e) => setOrderSettings({ ...orderSettings, extraItemCharge: e.target.value })}
                                            />
                                        </div>

                                        {/* Delivery Campus Charges */}
                                        <div className="pl-13 bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                            <div>
                                                <h4 className="font-bold text-white text-sm">Campus Delivery Charges</h4>
                                                <p className="text-xs text-gray-500">Extra charge per campus added on top of the base delivery charge.</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG).map((campus, idx) => (
                                                    <div key={campus.id} className="bg-black/20 p-4 rounded-xl border border-white/5">
                                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">{campus.name} (₹)</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={campus.deliveryCharge}
                                                            onChange={(e) => {
                                                                const config = [...(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG)];
                                                                config[idx] = { ...config[idx], deliveryCharge: Math.max(0, Number(e.target.value)) };
                                                                setOrderSettings({ ...orderSettings, deliveryCampusConfig: config });
                                                            }}
                                                            className="w-full bg-black/30 p-3 rounded-xl text-white font-bold border border-white/10 focus:border-purple-500 outline-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Light Items Section */}
                                        <div className="pl-13 bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">Light Items</h4>
                                                    <p className="text-xs text-gray-500">Items that bundle before counting towards extra delivery charge.</p>
                                                </div>
                                                <div className="w-32">
                                                    <FormInput
                                                        label="Bundle Size"
                                                        type="number"
                                                        value={orderSettings.lightItemThreshold || "5"}
                                                        onChange={(e) => setOrderSettings({ ...orderSettings, lightItemThreshold: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Selected Light Items */}
                                            <div className="flex flex-wrap gap-2">
                                                {(orderSettings.lightItems || []).map(itemId => {
                                                    const allItems = restaurants.flatMap(r => (r.menu || []).map(m => ({ ...m, restaurantName: r.name })));
                                                    const item = allItems.find(i => i.id === itemId);
                                                    return item ? (
                                                        <span key={itemId} className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-orange-500/20">
                                                            {item.name} <span className="text-gray-500 text-[10px]">({item.restaurantName})</span>
                                                            <button
                                                                onClick={() => setOrderSettings({
                                                                    ...orderSettings,
                                                                    lightItems: (orderSettings.lightItems || []).filter(id => id !== itemId)
                                                                })}
                                                                className="hover:text-red-400"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    ) : null;
                                                })}
                                                {(orderSettings.lightItems || []).length === 0 && (
                                                    <span className="text-gray-500 text-xs italic">No light items selected</span>
                                                )}
                                            </div>

                                            {/* Add Light Item Search */}
                                            <div className="relative">
                                                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus-within:border-orange-500/50">
                                                    <Search size={16} className="text-gray-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search items to add..."
                                                        value={lightItemSearchQuery}
                                                        onChange={(e) => setLightItemSearchQuery(e.target.value)}
                                                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500"
                                                    />
                                                    {lightItemSearchQuery && (
                                                        <button onClick={() => setLightItemSearchQuery("")} className="text-gray-500 hover:text-white">
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                {lightItemSearchQuery.trim().length > 0 && (
                                                    <div className="absolute z-20 left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                                                        {restaurants.flatMap(r =>
                                                            (r.menu || [])
                                                                .filter(item =>
                                                                    item.name.toLowerCase().includes(lightItemSearchQuery.toLowerCase()) &&
                                                                    !(orderSettings.lightItems || []).includes(item.id)
                                                                )
                                                                .map(item => (
                                                                    <button
                                                                        key={item.id}
                                                                        onClick={() => {
                                                                            setOrderSettings({
                                                                                ...orderSettings,
                                                                                lightItems: [...(orderSettings.lightItems || []), item.id]
                                                                            });
                                                                            setLightItemSearchQuery("");
                                                                        }}
                                                                        className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-white flex justify-between items-center"
                                                                    >
                                                                        <span>{item.name}</span>
                                                                        <span className="text-gray-500 text-xs">{r.name}</span>
                                                                    </button>
                                                                ))
                                                        )}
                                                        {restaurants.flatMap(r => (r.menu || []).filter(item =>
                                                            item.name.toLowerCase().includes(lightItemSearchQuery.toLowerCase()) &&
                                                            !(orderSettings.lightItems || []).includes(item.id)
                                                        )).length === 0 && (
                                                                <div className="px-4 py-3 text-gray-500 text-sm text-center">No matching items</div>
                                                            )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Heavy Items Section */}
                                        <div className="pl-13 bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">Heavy Items</h4>
                                                    <p className="text-xs text-gray-500">Items that add a higher per-item surcharge instead of the regular extra charge.</p>
                                                </div>
                                                <div className="w-32">
                                                    <FormInput
                                                        label="Charge (₹)"
                                                        type="number"
                                                        value={orderSettings.heavyItemCharge || "30"}
                                                        onChange={(e) => setOrderSettings({ ...orderSettings, heavyItemCharge: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Selected Heavy Items */}
                                            <div className="flex flex-wrap gap-2">
                                                {(orderSettings.heavyItems || []).map(itemId => {
                                                    const allItems = restaurants.flatMap(r => (r.menu || []).map(m => ({ ...m, restaurantName: r.name })));
                                                    const item = allItems.find(i => i.id === itemId);
                                                    return item ? (
                                                        <span key={itemId} className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-red-500/20">
                                                            {item.name} <span className="text-gray-500 text-[10px]">({item.restaurantName})</span>
                                                            <button
                                                                onClick={() => setOrderSettings({
                                                                    ...orderSettings,
                                                                    heavyItems: (orderSettings.heavyItems || []).filter(id => id !== itemId)
                                                                })}
                                                                className="hover:text-red-400"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    ) : null;
                                                })}
                                                {(orderSettings.heavyItems || []).length === 0 && (
                                                    <span className="text-gray-500 text-xs italic">No heavy items selected</span>
                                                )}
                                            </div>

                                            {/* Add Heavy Item Search */}
                                            <div className="relative">
                                                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus-within:border-red-500/50">
                                                    <Search size={16} className="text-gray-500" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search items to add..."
                                                        value={heavyItemSearchQuery}
                                                        onChange={(e) => setHeavyItemSearchQuery(e.target.value)}
                                                        className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500"
                                                    />
                                                    {heavyItemSearchQuery && (
                                                        <button onClick={() => setHeavyItemSearchQuery("")} className="text-gray-500 hover:text-white">
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                {heavyItemSearchQuery.trim().length > 0 && (
                                                    <div className="absolute z-20 left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                                                        {restaurants.flatMap(r =>
                                                            (r.menu || [])
                                                                .filter(item =>
                                                                    item.name.toLowerCase().includes(heavyItemSearchQuery.toLowerCase()) &&
                                                                    !(orderSettings.heavyItems || []).includes(item.id) &&
                                                                    !(orderSettings.lightItems || []).includes(item.id)
                                                                )
                                                                .map(item => (
                                                                    <button
                                                                        key={item.id}
                                                                        onClick={() => {
                                                                            setOrderSettings({
                                                                                ...orderSettings,
                                                                                heavyItems: [...(orderSettings.heavyItems || []), item.id]
                                                                            });
                                                                            setHeavyItemSearchQuery("");
                                                                        }}
                                                                        className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-white flex justify-between items-center"
                                                                    >
                                                                        <span>{item.name}</span>
                                                                        <span className="text-gray-500 text-xs">{r.name}</span>
                                                                    </button>
                                                                ))
                                                        )}
                                                        {restaurants.flatMap(r => (r.menu || []).filter(item =>
                                                            item.name.toLowerCase().includes(heavyItemSearchQuery.toLowerCase()) &&
                                                            !(orderSettings.heavyItems || []).includes(item.id) &&
                                                            !(orderSettings.lightItems || []).includes(item.id)
                                                        )).length === 0 && (
                                                                <div className="px-4 py-3 text-gray-500 text-sm text-center">No matching items</div>
                                                            )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {(orderSettings.slots || []).length === 0 && (
                                            <div className="pl-13 text-gray-500 italic text-sm">No ordering slots defined. Service will remain offline.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                                                <div className="relative">
                                                    <Clock size={16} className="absolute -left-1 -top-1 opacity-50" />
                                                    <Tag size={18} className="relative z-10" />
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Grocery Service Hours</h3>
                                        </div>
                                        <button
                                            onClick={() => setGrocerySettings({ ...grocerySettings, slots: [...(grocerySettings.slots || []), { start: "10:00", end: "22:00" }] })}
                                            className="bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-green-500/20 flex items-center gap-2"
                                        >
                                            <Plus size={14} /> Add Slot
                                        </button>
                                    </div>
                                    <p className="text-gray-400 text-sm pl-13">Define time windows when the Grocery service is active.</p>

                                    <div className="space-y-4 pt-2">
                                        {(grocerySettings.slots || []).map((slot, index) => (
                                            <div key={index} className="pl-13 flex flex-col md:flex-row gap-4 items-start md:items-end">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Start Time</label>
                                                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">{format12h(slot.start)}</span>
                                                    </div>
                                                    <input
                                                        type="time"
                                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-green-500/50 transition-all font-bold [color-scheme:dark]"
                                                        value={slot.start}
                                                        onChange={(e) => {
                                                            const newSlots = [...(grocerySettings.slots || [])];
                                                            newSlots[index].start = e.target.value;
                                                            setGrocerySettings({ ...grocerySettings, slots: newSlots });
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">End Time</label>
                                                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">{format12h(slot.end)}</span>
                                                    </div>
                                                    <input
                                                        type="time"
                                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-green-500/50 transition-all font-bold [color-scheme:dark]"
                                                        value={slot.end}
                                                        onChange={(e) => {
                                                            const newSlots = [...(grocerySettings.slots || [])];
                                                            newSlots[index].end = e.target.value;
                                                            setGrocerySettings({ ...grocerySettings, slots: newSlots });
                                                        }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setGrocerySettings({ ...grocerySettings, slots: (grocerySettings.slots || []).filter((_, i) => i !== index) })}
                                                    className="p-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all flex-shrink-0"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </div>
                                        ))}
                                        {(grocerySettings.slots || []).length === 0 && (
                                            <div className="pl-13 text-gray-500 italic text-sm">No grocery slots defined. Service will remain offline.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                                <Sparkles size={18} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Payment Settings</h3>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm pl-13">Upload your Payment QR code. This will be sent as a link in the WhatsApp order message.</p>

                                    <div className="pl-13 space-y-4">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Payment QR Image URL</label>
                                        <div className="flex gap-4">
                                            <div className="flex-1 relative group">
                                                <input
                                                    type="text"
                                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder-gray-600"
                                                    value={orderSettings.paymentQR || ""}
                                                    onChange={(e) => setOrderSettings({ ...orderSettings, paymentQR: e.target.value })}
                                                    placeholder="QR Code Image URL..."
                                                />
                                            </div>
                                            <label className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl cursor-pointer text-white transition-colors flex items-center justify-center min-w-[60px] border border-white/10">
                                                <Upload size={20} />
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setOrderSettings({ ...orderSettings, paymentQR: url }))} />
                                            </label>
                                        </div>
                                        {orderSettings.paymentQR && (
                                            <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 inline-block">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Preview</p>
                                                <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                                                    <Image src={orderSettings.paymentQR} alt="Payment QR Preview" fill className="object-cover" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                                                <Phone size={18} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">WhatsApp Numbers</h3>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm pl-13">Configure the WhatsApp numbers for order redirects. Include country code without + (e.g., 919048086503).</p>

                                    <div className="pl-13 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput
                                            label="Food Delivery"
                                            type="tel"
                                            value={orderSettings.whatsappNumber || ""}
                                            onChange={(e) => setOrderSettings({ ...orderSettings, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                                            placeholder="919048086503"
                                        />
                                        <FormInput
                                            label="Laundry"
                                            type="tel"
                                            value={orderSettings.laundryWhatsappNumber || ""}
                                            onChange={(e) => setOrderSettings({ ...orderSettings, laundryWhatsappNumber: e.target.value.replace(/\D/g, '') })}
                                            placeholder="919048086503"
                                        />
                                        <FormInput
                                            label="Grocery"
                                            type="tel"
                                            value={grocerySettings.whatsappNumber || ""}
                                            onChange={(e) => setGrocerySettings({ ...grocerySettings, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                                            placeholder="919048086503"
                                        />
                                    </div>

                                    <div className="pl-13 mt-4">
                                        <FormInput
                                            label="UPI ID (for order message)"
                                            type="text"
                                            value={orderSettings.upiId || ""}
                                            onChange={(e) => setOrderSettings({ ...orderSettings, upiId: e.target.value })}
                                            placeholder="example@upi"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">This UPI ID will be included in the WhatsApp order message for payment.</p>
                                    </div>

                                    <div className="pl-13 mt-4">
                                        <FormInput
                                            label="Google Sheet URL (for orders)"
                                            type="url"
                                            value={orderSettings.googleSheetUrl || ""}
                                            onChange={(e) => setOrderSettings({ ...orderSettings, googleSheetUrl: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500 mt-2">Orders will be logged to this Google Apps Script URL. Leave empty to disable.</p>
                                    </div>
                                </div>

                                {/* WhatsApp Community Groups */}
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <Phone size={18} className="text-green-500" /> Community Groups
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => setOrderSettings({
                                                ...orderSettings,
                                                whatsappGroups: [...(orderSettings.whatsappGroups || []), { name: "", link: "" }]
                                            })}
                                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Add Group
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">Add WhatsApp group invite links. These will appear in the navbar under "Community".</p>

                                    {(orderSettings.whatsappGroups || []).length === 0 ? (
                                        <p className="text-sm text-gray-500 italic text-center py-4">No community groups added yet.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {(orderSettings.whatsappGroups || []).map((group, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Group Name"
                                                        value={group.name}
                                                        onChange={(e) => {
                                                            const updated = [...orderSettings.whatsappGroups];
                                                            updated[idx].name = e.target.value;
                                                            setOrderSettings({ ...orderSettings, whatsappGroups: updated });
                                                        }}
                                                        className="flex-1 bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500"
                                                    />
                                                    <input
                                                        type="url"
                                                        placeholder="https://chat.whatsapp.com/..."
                                                        value={group.link}
                                                        onChange={(e) => {
                                                            const updated = [...orderSettings.whatsappGroups];
                                                            updated[idx].link = e.target.value;
                                                            setOrderSettings({ ...orderSettings, whatsappGroups: updated });
                                                        }}
                                                        className="flex-[2] bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = orderSettings.whatsappGroups.filter((_, i) => i !== idx);
                                                            setOrderSettings({ ...orderSettings, whatsappGroups: updated });
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>


                            </div>
                        </div>
                    </motion.div>
                )}

            </div>

            {/* Sticky Action Bar */}
            <AnimatePresence>
                {((activeSection === "restaurants" && activeTab === "form") ||
                    (activeSection === "coupons" && activeTab === "form") ||
                    (activeSection === "laundry") ||
                    (activeSection === "banners") ||
                    (activeSection === "settings")) && (
                        <motion.div
                            initial={{ y: 100, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 100, opacity: 0 }}
                            className="fixed bottom-0 left-0 right-0 z-[60] p-4 pb-8 md:pb-4 border-t border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl"
                        >
                            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 md:gap-4">
                                <div className="hidden md:block">
                                    <p className="text-white font-bold text-sm flex items-center gap-2">
                                        <Sparkles size={16} className="text-orange-500" />
                                        {activeSection === "restaurants" && (editingId ? "Editing Restaurant" : "Creating Restaurant")}
                                        {activeSection === "coupons" && (editingId ? "Editing Coupon" : "Creating Coupon")}
                                        {activeSection === "laundry" && "Managing Laundry Slots"}
                                        {activeSection === "banners" && "Managing Promo Banners"}
                                        {activeSection === "settings" && "Global Site Settings"}
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    {(activeSection === "restaurants" || activeSection === "coupons") && (
                                        <button
                                            onClick={() => {
                                                setActiveTab("list");
                                                setEditingId(null);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="px-4 md:px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5 text-xs md:text-sm"
                                        >
                                            Cancel
                                        </button>
                                    )}

                                    {activeSection === "restaurants" && activeTab === "form" && (
                                        <button
                                            onClick={addMenuItem}
                                            className="bg-white text-black px-4 md:px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 text-xs md:text-sm"
                                        >
                                            <Plus size={18} /> Add Item
                                        </button>
                                    )}

                                    <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl items-center">
                                        <button
                                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                            className="p-2.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                            title="Scroll to Top"
                                        >
                                            <ChevronUp size={20} />
                                        </button>
                                        <div className="w-px h-4 bg-white/10 mx-1"></div>
                                        <button
                                            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                                            className="p-2.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                            title="Scroll to Bottom"
                                        >
                                            <ChevronDown size={20} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (activeSection === "restaurants") handleSubmitRestaurant();
                                            else if (activeSection === "coupons") handleSubmitCoupon();
                                            else if (activeSection === "laundry") handleBulkApply();
                                            else if (activeSection === "banners") handleSaveBanners();
                                            else if (activeSection === "settings") handleSaveSettings();
                                        }}
                                        className="flex-1 md:flex-none bg-orange-600 text-white px-4 md:px-8 py-3 rounded-xl font-bold hover:bg-orange-500 transition-all shadow-xl shadow-orange-900/40 flex items-center justify-center gap-2 group text-xs md:text-sm"
                                    >
                                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                                        <span>
                                            {activeSection === "restaurants" ? (editingId ? "Update" : "Create") : ""}
                                            {activeSection === "coupons" ? (editingId ? "Update" : "Create") : ""}
                                            {activeSection === "laundry" ? "Apply" : ""}
                                            {activeSection === "banners" ? "Update" : ""}
                                            {activeSection === "settings" ? "Save Settings" : ""}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
            </AnimatePresence>
        </div>
    );
}

// Helper Component for Inputs
function FormInput({ label, value, onChange, placeholder, type = "text" }) {
    return (
        <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium placeholder-gray-600"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        </div>
    );
}
