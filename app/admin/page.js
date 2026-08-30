"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import {
    LogOut,
    ArrowLeft,
    Utensils,
    Truck,
    ShoppingCart,
    Clock,
    Settings,
    Tag,
    Sparkles,
    Loader2,
    Bell,
    Users,
    BarChart3,
    Store,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
} from "firebase/firestore";
import {
    saveOrderSettings,
    savePromoBanners,
    saveGrocerySettings,
    saveLaundryCampus,
    saveLaundryPricing,
    saveLaundrySlots,
    fetchOrderSettings,
    fetchPromoBanners,
    fetchGrocerySettings,
    fetchLaundryConfig,
    fetchLaundrySlots,
} from "@/lib/repositories";
import toast from "react-hot-toast";
import { manageCoupons } from "@/lib/functions";
import Link from "next/link";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { COLLECTIONS } from "@/lib/constants";
import { useFcmToken } from "@/app/hooks/useFcmToken";
import { useSettingsForm } from "./hooks/useSettingsForm";

// Import Extracted Components
import RestaurantsTab from "./components/RestaurantsTab";
import OrdersTab from "./components/OrdersTab";
import CouponsTab from "./components/CouponsTab";
import BannersTab from "./components/BannersTab";
import UsersTab from "./components/UsersTab";
import LaundrySettings from "./components/LaundrySettings";
import DeliverySettings from "./components/DeliverySettings";
import GrocerySettings from "./components/GrocerySettings";
import GlobalSettings from "./components/GlobalSettings";
import StickyActionBar from "./components/StickyActionBar";
import MarketplaceTab from "./components/MarketplaceTab";
import SaveConfirmationModal from "./components/SaveConfirmationModal";

import { format12h } from "@/lib/formatters";
import { createFileUploadHandler } from "@/lib/uploadImage";

const handleFileUpload = createFileUploadHandler("site-content");

const NAV_TABS = [
    { id: "orders", label: "Live Orders", icon: Bell, accent: true },
    { id: "restaurants", label: "Restaurants", icon: Utensils },
    { id: "delivery", label: "Delivery", icon: Truck },
    { id: "grocery", label: "Grocery", icon: ShoppingCart },
    { id: "laundry", label: "Laundry", icon: Clock },
    { id: "settings", label: "Global", icon: Settings },
    { id: "coupons", label: "Promo Codes", icon: Tag },
    { id: "banners", label: "Banners", icon: Sparkles },
    { id: "users", label: "Users", icon: Users },
    { id: "marketplace", label: "Marketplace", icon: Store },
];

// `site_content/order_settings` is written by two tabs. Each owns a disjoint set
// of keys, and each saves only its own diff, so neither can clobber the other's.
const DELIVERY_KEYS = [
    "baseDeliveryCharge",
    "extraItemThreshold",
    "extraItemCharge",
    "minOrderAmount",
    "lightItems",
    "lightItemThreshold",
    "heavyItems",
    "heavyItemCharge",
    "deliveryCampusConfig",
    "manualOverride",
];
const GLOBAL_KEYS = [
    "whatsappNumber",
    "laundryWhatsappNumber",
    "paymentQR",
    "upiId",
    "upiPayeeName",
    "googleSheetUrl",
    "whatsappGroups",
];

const DEFAULT_BANNERS = {
    banner1: { title: "50% OFF", sub: "Welcome Bonus", hidden: false },
    banner2: { title: "Free Delivery", sub: "On all orders", hidden: false },
    banner3: { title: "Tasty Deals", sub: "Flat ₹100 Off", hidden: false },
};

// Array fields the editors mutate in place (spread, .filter) without a guard,
// so they have to arrive as arrays even when the document has never been written.
const DELIVERY_DEFAULTS = { lightItems: [], heavyItems: [] };
const GLOBAL_DEFAULTS = { whatsappGroups: [] };

const project = (obj, keys, defaults) => {
    const out = Object.fromEntries(keys.map((k) => [k, obj?.[k]]));
    for (const [key, fallback] of Object.entries(defaults)) out[key] ??= fallback;
    return out;
};

export default function AdminPage() {
    const router = useRouter();
    const { user, isAdmin, loading: authLoading, logout } = useAdminAuth();

    const [activeSection, setActiveSection] = useState("orders");
    const [orders, setOrders] = useState([]); // placed (pending admin action)
    const [inProgressOrders, setInProgressOrders] = useState([]); // confirmed → ready_for_delivery + out_of_stock
    const [pastOrders, setPastOrders] = useState([]); // picked_up / delivered
    const [loadingOrders, setLoadingOrders] = useState(true);
    const isInitialLoad = useRef(true);
    const audioRef = useRef(null);
    const [restaurants, setRestaurants] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [laundryOrders, setLaundryOrders] = useState([]);
    const [loadingLaundryOrders, setLoadingLaundryOrders] = useState(true);

    // Laundry slot editor — per-day docs, edited inline rather than through the
    // sticky Save bar, so it stays outside the settings-form machinery.
    const [selectedDay, setSelectedDay] = useState("default");
    const [laundrySlots, setLaundrySlots] = useState([]);
    const [slotStart, setSlotStart] = useState("");
    const [slotEnd, setSlotEnd] = useState("");

    // --- SETTINGS FORMS ---
    // One instance per tab: independent fetch, baseline, diff and save state.

    const deliveryForm = useSettingsForm({
        label: "Delivery settings",
        confirm: true,
        load: useCallback(
            async () => project(await fetchOrderSettings(), DELIVERY_KEYS, DELIVERY_DEFAULTS),
            []
        ),
        // order_settings is written with merge:true, so the diff alone is safe.
        save: useCallback(({ diff }) => saveOrderSettings(diff), []),
    });

    const globalForm = useSettingsForm({
        label: "Global settings",
        confirm: true,
        load: useCallback(
            async () => project(await fetchOrderSettings(), GLOBAL_KEYS, GLOBAL_DEFAULTS),
            []
        ),
        save: useCallback(({ diff }) => saveOrderSettings(diff), []),
    });

    const groceryForm = useSettingsForm({
        label: "Grocery settings",
        confirm: true,
        load: useCallback(() => fetchGrocerySettings(), []),
        // grocery_settings is a full-document overwrite — sending only the diff
        // would wipe every field the diff doesn't mention.
        save: useCallback(({ data }) => saveGrocerySettings(data), []),
    });

    const bannersForm = useSettingsForm({
        label: "Promo banners",
        initial: DEFAULT_BANNERS,
        load: useCallback(() => fetchPromoBanners(), []),
        save: useCallback(({ data }) => savePromoBanners(data), []), // full overwrite
    });

    const laundryForm = useSettingsForm({
        label: "Laundry config",
        initial: { campuses: [], pricing: { pricePerKg: "", steamIronPrice: "" } },
        load: useCallback(() => fetchLaundryConfig(), []),
        save: useCallback(
            ({ data }) =>
                Promise.all([
                    saveLaundryCampus({ campuses: data.campuses }),
                    saveLaundryPricing(data.pricing),
                ]),
            []
        ),
    });

    // Which forms the sticky Save bar drives on each tab. The Global tab edits one
    // grocery field (its WhatsApp number), so it commits both documents.
    const SETTINGS_TABS = {
        delivery: { forms: [deliveryForm], title: "Delivery Settings" },
        grocery: { forms: [groceryForm], title: "Grocery Settings" },
        settings: { forms: [globalForm, groceryForm], title: "Global Settings" },
        banners: { forms: [bannersForm], title: "Managing Promo Banners" },
        laundry: {
            forms: [laundryForm],
            title: "Managing Laundry Slots & Charges",
            saveLabel: "Save Config",
        },
    };

    const activeSettings = SETTINGS_TABS[activeSection];
    const activeForms = activeSettings?.forms ?? [];
    const pendingForms = activeForms.filter((f) => f.pending);

    // Redirect to login if not authenticated or not admin
    if (!authLoading && (!user || !isAdmin)) {
        router.push("/admin/login");
    }

    // Register FCM token for this device once the admin is confirmed
    useFcmToken(user && isAdmin ? user : null);

    // Global Order Notification Logic
    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio("/faaah.mpeg");
        audioRef.current.preload = "auto";

        // Click-to-unlock browser policy handler
        const unlock = () => {
            if (audioRef.current) {
                audioRef.current
                    .play()
                    .then(() => {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                    })
                    .catch((err) => console.warn("Audio playback error:", err));
            }
            document.removeEventListener("click", unlock);
        };
        document.addEventListener("click", unlock);
        return () => document.removeEventListener("click", unlock);
    }, []);

    const playNotificationSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((e) => console.log("Sound play failed:", e));
        }
    }, []);

    useEffect(() => {
        if (!user || !isAdmin) return;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Listen for "placed" orders from today
        const q = query(
            collection(db, COLLECTIONS.ORDERS),
            where("status", "==", "placed"),
            where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const newOrders = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                }));

                // Play sound for new orders (not on initial load)
                if (isInitialLoad.current) {
                    isInitialLoad.current = false;
                } else if (snapshot.docChanges().some((change) => change.type === "added")) {
                    playNotificationSound();
                    toast("New Order Received!", { icon: "🔔" });
                }

                setOrders(newOrders);
                setLoadingOrders(false);
            },
            (error) => {
                console.error("Orders listener error:", error);
                setLoadingOrders(false);
            }
        );

        return () => unsubscribe();
    }, [user, isAdmin, playNotificationSound]);

    // In-progress orders listener (confirmed/viewed/ready_for_delivery/out_of_stock)
    useEffect(() => {
        if (!user || !isAdmin) return;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const q = query(
            collection(db, COLLECTIONS.ORDERS),
            where("status", "in", ["confirmed", "viewed", "ready_for_delivery", "out_of_stock"]),
            where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
            orderBy("createdAt", "asc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setInProgressOrders(
                snap.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                    createdAt: d.data().createdAt?.toDate(),
                }))
            );
        });
        return () => unsub();
    }, [user, isAdmin]);

    useEffect(() => {
        if (!user || !isAdmin) return;

        const unsub = onSnapshot(
            collection(db, COLLECTIONS.LAUNDRY_ORDERS),
            (snap) => {
                const ordersData = snap.docs
                    .map((snapshotDoc) => ({
                        id: snapshotDoc.id,
                        ...snapshotDoc.data(),
                        createdAt: snapshotDoc.data().createdAt?.toDate?.() || null,
                    }))
                    .sort((a, b) => {
                        const dateCompare = (a.scheduledDate || "").localeCompare(
                            b.scheduledDate || ""
                        );
                        if (dateCompare !== 0) return dateCompare;
                        const timeA = a.createdAt?.getTime?.() || 0;
                        const timeB = b.createdAt?.getTime?.() || 0;
                        return timeB - timeA;
                    });

                setLaundryOrders(ordersData);
                setLoadingLaundryOrders(false);
            },
            (error) => {
                console.error("Laundry orders listener error:", error);
                setLoadingLaundryOrders(false);
            }
        );

        return () => unsub();
    }, [user, isAdmin]);

    // Past orders listener (picked_up / delivered)
    useEffect(() => {
        if (!user || !isAdmin) return;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const q = query(
            collection(db, COLLECTIONS.ORDERS),
            where("status", "in", ["picked_up", "delivered"]),
            where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
            orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(q, (snap) => {
            setPastOrders(
                snap.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                    createdAt: d.data().createdAt?.toDate(),
                }))
            );
        });
        return () => unsub();
    }, [user, isAdmin]);

    // Laundry slots are per-day, so they reload when the selected day changes
    useEffect(() => {
        if (activeSection !== "laundry") return;
        fetchLaundrySlots(selectedDay)
            .then(setLaundrySlots)
            .catch((error) => console.error("Error fetching slots:", error));
    }, [activeSection, selectedDay]);

    /** Restaurants + coupons. Settings tabs load themselves via useSettingsForm. */
    const fetchData = useCallback(async () => {
        try {
            const [resSnap, promoRes] = await Promise.all([
                getDocs(collection(db, COLLECTIONS.RESTAURANTS)),
                (async () => {
                    try {
                        const idToken = await user.getIdToken();
                        return await manageCoupons(
                            { action: "FETCH_ALL" },
                            { authorization: `Bearer ${idToken}` }
                        );
                    } catch (err) {
                        console.error("Failed to fetch coupons", err);
                        return { data: [] };
                    }
                })(),
            ]);

            setRestaurants(resSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id })));

            setCoupons(
                (promoRes.data || []).map((c) => ({
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
                    itemId: c.item_id,
                }))
            );
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load restaurants and coupons");
        }
    }, [user]);

    useEffect(() => {
        if (user && isAdmin) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchData();
        }
    }, [user, isAdmin, fetchData]);

    // --- LAUNDRY SLOT HANDLERS ---
    const persistSlots = async (updatedSlots) => {
        setLaundrySlots(updatedSlots);
        try {
            await saveLaundrySlots(selectedDay, { slots: updatedSlots });
        } catch (error) {
            console.error("Error saving slots:", error);
            toast.error("Failed to save slot");
        }
    };

    const handleAddSlot = async () => {
        if (!slotStart || !slotEnd) {
            toast.error("Please select both start and end times.");
            return;
        }

        const [startH, startM] = slotStart.split(":").map(Number);
        const [endH, endM] = slotEnd.split(":").map(Number);
        if (startH * 60 + startM >= endH * 60 + endM) {
            toast.error("Start time must be before end time.");
            return;
        }

        const formattedSlot = `${format12h(slotStart)} - ${format12h(slotEnd)}`;

        if (laundrySlots.includes(formattedSlot)) {
            toast.error("This slot already exists.");
            return;
        }

        const updatedSlots = [...laundrySlots, formattedSlot].sort((a, b) => {
            const getMinutes = (s) => {
                const parts = s.split(" - ")[0].match(/(\d+):(\d+) (AM|PM)/);
                if (!parts) return 0;
                let h = parseInt(parts[1]);
                const m = parseInt(parts[2]);
                const amp = parts[3];
                if (amp === "PM" && h !== 12) h += 12;
                if (amp === "AM" && h === 12) h = 0;
                return h * 60 + m;
            };
            return getMinutes(a) - getMinutes(b);
        });

        setSlotStart("");
        setSlotEnd("");
        await persistSlots(updatedSlots);
    };

    const handleDeleteSlot = (index) => persistSlots(laundrySlots.filter((_, i) => i !== index));

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
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.04] z-[0] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            ></div>

            {/* Background Glows */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-orange-900/20 rounded-full blur-[120px] pointer-events-none" />

            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 pt-24 relative z-10">
                {/* Header & Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Link
                                href="/"
                                className="inline-flex items-center text-gray-400 hover:text-white text-sm font-medium transition-colors"
                            >
                                <ArrowLeft size={16} className="mr-2" /> Back to Store
                            </Link>
                            <button
                                onClick={logout}
                                className="inline-flex items-center text-gray-400 hover:text-red-400 text-sm font-medium transition-colors gap-1"
                            >
                                <LogOut size={14} /> Logout
                            </button>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Admin Dashboard
                        </h1>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-md min-w-max">
                            {NAV_TABS.map(({ id, label, icon: Icon, accent }) => {
                                const isActive = activeSection === id;
                                const activeClass = accent
                                    ? "bg-orange-600 text-white shadow-lg shadow-orange-900/40"
                                    : "bg-white/10 text-white shadow-lg border border-white/10";
                                return (
                                    <button
                                        key={id}
                                        onClick={() => setActiveSection(id)}
                                        className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none ${accent ? "relative" : ""} ${
                                            isActive
                                                ? activeClass
                                                : "text-gray-400 hover:text-white hover:bg-white/5"
                                        }`}
                                    >
                                        <Icon size={16} /> {label}
                                        {id === "orders" && orders.length > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full animate-pulse border-2 border-black">
                                                {orders.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                            <Link
                                href="/admin/analytics"
                                className="px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 md:flex-none text-gray-400 hover:text-white hover:bg-white/5"
                            >
                                <BarChart3 size={16} /> Analytics
                            </Link>
                        </div>
                    </div>
                </div>

                {/* --- CONTENT SECTIONS --- */}
                <div className="min-h-[500px]">
                    {activeSection === "orders" && (
                        <OrdersTab
                            orders={orders}
                            inProgressOrders={inProgressOrders}
                            pastOrders={pastOrders}
                            loading={loadingOrders}
                            user={user}
                        />
                    )}

                    {activeSection === "restaurants" && (
                        <RestaurantsTab
                            restaurants={restaurants}
                            fetchData={fetchData}
                            orderSettings={deliveryForm.data}
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
                            orderSettings={deliveryForm.data}
                            setOrderSettings={deliveryForm.setData}
                            restaurants={restaurants}
                            settingsLoaded={deliveryForm.loaded}
                        />
                    )}

                    {activeSection === "grocery" && (
                        <GrocerySettings
                            grocerySettings={groceryForm.data}
                            setGrocerySettings={groceryForm.setData}
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
                            laundryPricing={laundryForm.data.pricing}
                            setLaundryPricing={(pricing) =>
                                laundryForm.setData((d) => ({
                                    ...d,
                                    pricing:
                                        typeof pricing === "function"
                                            ? pricing(d.pricing)
                                            : pricing,
                                }))
                            }
                            onSavePricing={laundryForm.requestSave}
                            laundryOrders={laundryOrders}
                            loadingLaundryOrders={loadingLaundryOrders}
                        />
                    )}

                    {activeSection === "settings" && (
                        <GlobalSettings
                            orderSettings={globalForm.data}
                            setOrderSettings={globalForm.setData}
                            grocerySettings={groceryForm.data}
                            setGrocerySettings={groceryForm.setData}
                            handleFileUpload={handleFileUpload}
                            settingsLoaded={globalForm.loaded && groceryForm.loaded}
                        />
                    )}

                    {activeSection === "banners" && (
                        <BannersTab
                            banners={bannersForm.data}
                            setBanners={bannersForm.setData}
                            handleFileUpload={handleFileUpload}
                        />
                    )}

                    {activeSection === "users" && (
                        <UsersTab restaurants={restaurants} user={user} />
                    )}

                    {activeSection === "marketplace" && <MarketplaceTab />}
                </div>
            </div>

            {activeSettings && (
                <StickyActionBar
                    onSave={() => activeForms.forEach((f) => f.requestSave())}
                    onCancel={() => activeForms.forEach((f) => f.reload())}
                    isSaving={activeForms.some((f) => f.isSaving)}
                    disabled={!activeForms.every((f) => f.canSave)}
                    title={activeSettings.title}
                    saveLabel={activeSettings.saveLabel || "Save Settings"}
                />
            )}

            <SaveConfirmationModal
                isOpen={pendingForms.length > 0}
                onClose={() => pendingForms.forEach((f) => f.cancelSave())}
                onConfirm={() => pendingForms.forEach((f) => f.confirmSave())}
                title={activeSettings?.title || ""}
                data={Object.assign({}, ...pendingForms.map((f) => f.pending))}
            />
        </div>
    );
}
