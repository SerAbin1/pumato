"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import { Plus, Trash, Save, Tag, Utensils, Eye, EyeOff, Upload, LogOut, ArrowLeft, Clock, Calendar, Sparkles, Loader2, X, List, Search, ChevronUp, ChevronDown, Settings } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc, query, where } from "firebase/firestore";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import Image from "next/image";

import { toTitleCase } from "@/lib/formatters";

const format12h = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

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
    const [menuCategories, setMenuCategories] = useState([]); // Array of strings
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("list"); // list, form
    const [editingId, setEditingId] = useState(null);
    const [menuSearchQuery, setMenuSearchQuery] = useState("");

    // Laundry Slots State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [laundrySlots, setLaundrySlots] = useState([]);
    const [newSlot, setNewSlot] = useState("");
    const [isDefaultMode, setIsDefaultMode] = useState(false);

    // Bulk State
    const [bulkStartDate, setBulkStartDate] = useState("");
    const [bulkEndDate, setBulkEndDate] = useState("");
    const [isBulkApplying, setIsBulkApplying] = useState(false);

    // Site Settings
    const [orderSettings, setOrderSettings] = useState({ slots: [{ start: "18:30", end: "23:00" }] });

    // Restaurant Form State
    const [formData, setFormData] = useState({
        name: "", image: "", cuisine: "", deliveryTime: "30 mins", offer: "", priceForTwo: "",
        baseDeliveryCharge: "30", extraItemThreshold: "3", extraItemCharge: "10",
        isVisible: true,
        menu: []
    });

    // Coupon Form State
    const [couponForm, setCouponForm] = useState({
        code: "", type: "FLAT", value: "", minOrder: "0", description: "", isVisible: true, usageLimit: ""
    });

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
            if (isDefaultMode) {
                fetchLaundrySlots("default");
            } else {
                fetchLaundrySlots(selectedDate);
            }
        }
    }, [activeSection, selectedDate, isDefaultMode]);

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

            setRestaurants(resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id })));

            if (promoRes.error) throw promoRes.error;
            setCoupons(promoRes.data || []);

            // Fetch Categories
            const catDoc = await getDoc(doc(db, "site_content", "menu_categories"));
            if (catDoc.exists()) {
                setMenuCategories(catDoc.data().list || []);
            } else {
                setMenuCategories(["Recommended", "Starters", "Main Course", "Beverages", "Desserts"]); // Default
            }

            // Fetch Banners
            const bannerDoc = await getDoc(doc(db, "site_content", "promo_banners"));
            if (bannerDoc.exists()) {
                setBanners(bannerDoc.data());
            }

            const settingsDoc = await getDoc(doc(db, "site_content", "order_settings"));
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                // Migration/Normalization: handle old {startTime, endTime} structure
                if (data.startTime && !data.slots) {
                    setOrderSettings({ slots: [{ start: data.startTime, end: data.endTime }] });
                } else {
                    setOrderSettings(data);
                }
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

    // --- LAUNDRY HANDLERS ---
    const handleAddSlot = async () => {
        if (!newSlot.trim()) return;
        const updatedSlots = [...laundrySlots, newSlot.trim()];
        setLaundrySlots(updatedSlots);
        setNewSlot("");

        const targetDoc = isDefaultMode ? "default" : selectedDate;

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

        const targetDoc = isDefaultMode ? "default" : selectedDate;

        try {
            await setDoc(doc(db, "laundry_slots", targetDoc), {
                slots: updatedSlots
            });
        } catch (error) {
            console.error("Error deleting slot:", error);
        }
    };


    const handleBulkApply = async () => {
        if (!bulkStartDate || !bulkEndDate) {
            alert("Please select both Start and End dates.");
            return;
        }
        if (new Date(bulkStartDate) > new Date(bulkEndDate)) {
            alert("Start date cannot be after End date.");
            return;
        }
        if (!confirm(`This will OVERWRITE slots for all dates from ${bulkStartDate} to ${bulkEndDate} with the currently visible slots. Continue?`)) {
            return;
        }

        setIsBulkApplying(true);
        try {
            const start = new Date(bulkStartDate);
            const end = new Date(bulkEndDate);
            const batchPromises = [];

            // Prevent infinite loop if dates are crazy, cap at 365 days
            const MAX_DAYS = 365;
            let dayCount = 0;

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (dayCount++ > MAX_DAYS) break;
                const dateStr = d.toISOString().split('T')[0];
                batchPromises.push(
                    setDoc(doc(db, "laundry_slots", dateStr), {
                        slots: laundrySlots
                    })
                );
            }

            await Promise.all(batchPromises);
            alert("Bulk update successful!");
            setBulkStartDate("");
            setBulkEndDate("");
        } catch (error) {
            console.error("Bulk apply error:", error);
            alert("Failed to apply bulk updates.");
        }
        setIsBulkApplying(false);
    };

    // --- CATEGORY HANDLERS ---
    const handleAddCategory = async (newCat) => {
        if (!newCat.trim()) return;
        const formattedCat = newCat.trim().toUpperCase();
        const updated = [...menuCategories, formattedCat];
        setMenuCategories(updated);
        try {
            await setDoc(doc(db, "site_content", "menu_categories"), { list: updated });
        } catch (e) { console.error(e); alert("Failed to save category"); }
    };

    const handleDeleteCategory = async (cat) => {
        if (!confirm(`Delete category "${cat}"?`)) return;
        const updated = menuCategories.filter(c => c !== cat);
        setMenuCategories(updated);
        try {
            await setDoc(doc(db, "site_content", "menu_categories"), { list: updated });
        } catch (e) { console.error(e); alert("Failed to delete category"); }
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
            await setDoc(doc(db, "site_content", "order_settings"), orderSettings);
            alert("Settings updated successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to update settings");
        }
    };

    const normalizeAllData = async () => {
        if (!confirm("This will normalize the database: Restaurant Names and Categories will be UPPERCASE, Menu Items will be Title Case. Are you sure?")) return;

        setLoading(true);
        let updatedCount = 0;

        try {
            // 1. Normalize Global Menu Categories (UPPERCASE)
            const catDoc = await getDoc(doc(db, "site_content", "menu_categories"));
            if (catDoc.exists()) {
                const list = catDoc.data().list || [];
                const newList = list.map(c => c.toUpperCase());
                await setDoc(doc(db, "site_content", "menu_categories"), { list: newList });
                setMenuCategories(newList);
                updatedCount++;
            }

            // 2. Normalize Restaurants and their Menu Items
            const querySnapshot = await getDocs(collection(db, "restaurants"));
            const batchPromises = querySnapshot.docs.map(async (d) => {
                const data = d.data();
                const newName = (data.name || "").toUpperCase();
                const newCuisine = toTitleCase(data.cuisine || "");

                let newMenu = data.menu || [];
                if (newMenu.length > 0) {
                    newMenu = newMenu.map(item => ({
                        ...item,
                        name: toTitleCase(item.name || ""),
                        category: (item.category || "").toUpperCase()
                    }));
                }

                await setDoc(doc(db, "restaurants", d.id), {
                    ...data,
                    name: newName,
                    cuisine: newCuisine,
                    menu: newMenu
                });
                updatedCount++;
            });

            await Promise.all(batchPromises);
            await fetchData(); // Refresh local state
            alert(`SUCCESS: Normalized ${updatedCount} records based on new rules!`);
        } catch (error) {
            console.error("Normalization error:", error);
            alert("Failed to normalize data completely.");
        }
        setLoading(false);
    };

    // --- RESTAURANT HANDLERS ---
    const handleAddNew = () => {
        setEditingId(null);
        setFormData({
            name: "", image: "", cuisine: "", deliveryTime: "30 mins", offer: "", priceForTwo: "",
            baseDeliveryCharge: "30", extraItemThreshold: "3", extraItemCharge: "10",
            isVisible: true,
            categories: menuCategories,
            menu: []
        });
        setActiveTab("form");
        setMenuSearchQuery("");
    };

    const handleEdit = (restaurant) => {
        setEditingId(restaurant.id);
        setFormData({
            ...restaurant,
            categories: restaurant.categories || menuCategories
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
        setFormData({ ...formData, menu: [...(formData.menu || []), { id: Date.now().toString(), name: "", price: "", description: "", image: "", isVeg: null, isNonVeg: null, isVisible: true, category: "" }] });
    };

    const updateMenuItem = (index, field, value) => {
        const newMenu = [...formData.menu];
        newMenu[index][field] = value;
        setFormData({ ...formData, menu: newMenu });
    };

    const removeMenuItem = (index) => {
        const newMenu = formData.menu.filter((_, i) => i !== index);
        setFormData({ ...formData, menu: newMenu });
    };

    // --- COUPON HANDLERS ---
    const handleAddNewCoupon = () => {
        setEditingId(null);
        setCouponForm({ code: "", type: "FLAT", value: "", minOrder: "0", description: "", isVisible: true, usageLimit: "" });
        setActiveTab("form");
    };

    const handleEditCoupon = (coupon) => {
        setEditingId(coupon.id);
        setCouponForm({
            ...coupon,
            usageLimit: coupon.usage_limit,
            usedCount: coupon.used_count
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

        const id = editingId || couponForm.code.toUpperCase();
        const payload = {
            ...couponForm,
            id,
            usage_limit: limit,
            used_count: editingId ? (couponForm.usedCount || 0) : 0
        };

        try {
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
                                onClick={() => { setActiveSection("categories"); setActiveTab("list"); }}
                                className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${activeSection === "categories" ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                <List size={16} /> Categories
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

                                <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                                    <FormInput label="Base Del. Charge (₹)" type="number" value={formData.baseDeliveryCharge} onChange={(e) => setFormData({ ...formData, baseDeliveryCharge: e.target.value })} />
                                    <FormInput label="Extra Item Threshold" type="number" value={formData.extraItemThreshold} onChange={(e) => setFormData({ ...formData, extraItemThreshold: e.target.value })} />
                                    <FormInput label="Extra Charge (₹)" type="number" value={formData.extraItemCharge} onChange={(e) => setFormData({ ...formData, extraItemCharge: e.target.value })} />
                                </div>

                                <div className="col-span-full flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input
                                            type="checkbox"
                                            name="restaurant-visibility"
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
                                            {formData.isVisible !== false ? <Eye size={18} className="text-green-400" /> : <EyeOff size={18} className="text-gray-400" />}
                                            Restaurant Visible to Customers
                                        </label>
                                        <p className="text-xs text-gray-500 mt-1">Toggle off to temporarily hide this restaurant from the delivery page</p>
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
                                    {(formData.categories || []).map(cat => (
                                        <div key={cat} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full border border-white/10 hover:border-white/30 transition-all group">
                                            <span className="text-sm font-bold text-gray-200">{cat}</span>
                                            <button
                                                onClick={() => {
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        categories: (prev.categories || []).filter(c => c !== cat)
                                                    }));
                                                }}
                                                className="text-gray-500 hover:text-red-500 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-4 italic">
                                    * These categories are specific to this restaurant. They define the filter headings in the menu.
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
                                        Showing {(formData.menu || []).filter(item => !menuSearchQuery || item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())).length} of {(formData.menu || []).length} items
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {(formData.menu || []).filter(item => !menuSearchQuery || item.name.toLowerCase().includes(menuSearchQuery.toLowerCase())).map((item, idx) => {
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
                                                                        if (val) updateMenuItem(actualIdx, "isNonVeg", null);
                                                                    }}
                                                                    id={`veg-${actualIdx}`}
                                                                    className="w-5 h-5 accent-green-500 rounded"
                                                                />
                                                                <label htmlFor={`veg-${actualIdx}`} className="text-sm font-bold text-green-400">Pure Veg</label>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.isNonVeg === true}
                                                                    onChange={(e) => {
                                                                        const val = e.target.checked;
                                                                        updateMenuItem(actualIdx, "isNonVeg", val ? true : null);
                                                                        if (val) updateMenuItem(actualIdx, "isVeg", null);
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
                                <div key={c.id} className="bg-white/5 p-8 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all relative group hover:shadow-xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border border-orange-500/30">{c.type}</div>
                                        <div className="flex gap-3">
                                            <span className="text-gray-500 p-1" title={c.isVisible ? "Visible in Cart" : "Hidden in Cart"}>
                                                {c.isVisible !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </span>
                                            <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditCoupon(c)} className="text-gray-400 hover:text-blue-400"><Save size={18} /></button>
                                                <button onClick={() => handleDeleteCoupon(c.id)} className="text-gray-400 hover:text-red-500"><Trash size={18} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-2 tracking-tight">{c.code}</h3>
                                    <p className="text-gray-400 text-sm mb-6 font-medium">{c.description}</p>

                                    <div className="flex items-center justify-between text-sm font-bold text-gray-300 bg-black/30 p-4 rounded-xl border border-white/5">
                                        <span>Value: {c.type === 'FLAT' ? `₹${c.value}` : `${c.value}%`}</span>
                                        <span>Min: ₹{c.minOrder}</span>
                                        {c.usage_limit > 0 && (
                                            <span className={`${(c.used_count || 0) >= c.usage_limit ? 'text-red-400' : 'text-cyan-400'}`}>
                                                Used: {c.used_count || 0}/{c.usage_limit}
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
                                            </select>
                                        </div>
                                    </div>
                                    <FormInput label="Discount Value" type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} placeholder="50" />
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
                            {/* Date Selector */}
                            <div className="space-y-6">
                                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Select Date</label>
                                <div className="bg-black/30 p-6 rounded-2xl border border-white/10">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full bg-transparent text-2xl font-bold text-white outline-none border-b border-white/20 pb-2 focus:border-cyan-500 transition-colors [color-scheme:dark]"
                                    />
                                    <p className="text-gray-500 text-sm mt-4">Manage slots for this specific date.</p>
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

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSlot}
                                        onChange={(e) => setNewSlot(e.target.value)}
                                        placeholder="e.g. 10:00 AM - 12:00 PM"
                                        className="flex-1 p-4 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddSlot()}
                                    />
                                    <button
                                        onClick={handleAddSlot}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white p-4 rounded-xl transition-colors font-bold shadow-lg shadow-cyan-900/40"
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

                                {/* Bulk Actions */}
                                {!isDefaultMode && (
                                    <div className="mt-8 pt-8 border-t border-white/10">
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Calendar size={14} /> Bulk Apply to Range
                                        </h4>
                                        <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                            <p className="text-xs text-gray-500 mb-2">
                                                Copy the slots visible above to a range of dates.
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500">From</label>
                                                    <input
                                                        type="date"
                                                        value={bulkStartDate}
                                                        onChange={(e) => setBulkStartDate(e.target.value)}
                                                        className="w-full bg-black/20 p-3 rounded-xl text-white border border-white/10 focus:border-cyan-500 text-sm [color-scheme:dark]"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-gray-500">To</label>
                                                    <input
                                                        type="date"
                                                        value={bulkEndDate}
                                                        onChange={(e) => setBulkEndDate(e.target.value)}
                                                        className="w-full bg-black/20 p-3 rounded-xl text-white border border-white/10 focus:border-cyan-500 text-sm [color-scheme:dark]"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleBulkApply}
                                                disabled={isBulkApplying}
                                                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors border border-white/10 flex justify-center items-center gap-2 hover:shadow-lg opacity-0 pointer-events-none"
                                            >
                                                {isBulkApplying ? "Applying..." : "Apply Slots to Range"}
                                            </button>
                                        </div>
                                    </div>
                                )}
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

                {/* --- CATEGORIES SECTION --- */}
                {activeSection === "categories" && (
                    <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-4xl mx-auto shadow-2xl">
                        <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-6 flex items-center gap-3">
                            <List className="text-green-500" /> Manage Menu Categories
                        </h2>

                        <div className="flex gap-4 mb-8">
                            <input
                                className="flex-1 p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-green-500/50 transition-all font-medium"
                                placeholder="New Category Name (e.g. Desserts)"
                                id="new-cat-input"
                            />
                            <button
                                onClick={() => {
                                    const input = document.getElementById("new-cat-input");
                                    if (input) {
                                        handleAddCategory(input.value);
                                        input.value = "";
                                    }
                                }}
                                className="bg-green-600 text-white px-8 rounded-xl font-bold hover:bg-green-500 transition-colors shadow-lg shadow-green-900/40"
                            >
                                Add
                            </button>
                        </div>

                        <div className="grid gap-4">
                            {menuCategories.map(cat => (
                                <div key={cat} className="flex items-center justify-between bg-black/30 p-4 rounded-xl border border-white/5 group hover:border-white/10 transition-all">
                                    <span className="font-bold text-lg text-gray-200">{cat}</span>
                                    <button onClick={() => handleDeleteCategory(cat)} className="bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 p-2 rounded-lg transition-colors">
                                        <Trash size={18} />
                                    </button>
                                </div>
                            ))}
                            {menuCategories.length === 0 && <p className="text-center text-gray-500 italic">No categories found. Add one above!</p>}
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
                                        {(orderSettings.slots || []).length === 0 && (
                                            <div className="pl-13 text-gray-500 italic text-sm">No ordering slots defined. Service will remain offline.</div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveSettings}
                                    className="w-full md:w-auto bg-white text-black px-10 py-4 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all shadow-xl active:scale-95"
                                >
                                    Save All Settings
                                </button>

                                <div className="pt-8 border-t border-white/5">
                                    <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                                <Sparkles size={18} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Database Normalization</h3>
                                        </div>
                                        <p className="text-gray-400 text-sm pl-13">Fix inconsistent naming in your existing items. Use this to automatically capitalize all names, categories, and cuisines to Title Case.</p>
                                        <button
                                            onClick={normalizeAllData}
                                            disabled={loading}
                                            className="ml-13 flex items-center gap-2 text-red-400 hover:text-red-300 font-bold transition-all disabled:opacity-50"
                                        >
                                            <Trash size={16} /> Run Cleanup Tool
                                        </button>
                                    </div>
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
                    (activeSection === "banners")) && (
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
                                        }}
                                        className="flex-1 md:flex-none bg-orange-600 text-white px-4 md:px-8 py-3 rounded-xl font-bold hover:bg-orange-500 transition-all shadow-xl shadow-orange-900/40 flex items-center justify-center gap-2 group text-xs md:text-sm"
                                    >
                                        <Save size={18} className="group-hover:scale-110 transition-transform" />
                                        <span>
                                            {activeSection === "restaurants" ? (editingId ? "Update" : "Create") : ""}
                                            {activeSection === "coupons" ? (editingId ? "Update" : "Create") : ""}
                                            {activeSection === "laundry" ? "Apply" : ""}
                                            {activeSection === "banners" ? "Update" : ""}
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
