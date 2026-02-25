"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { db } from "@/lib/firebase";
import {
    doc, getDoc, setDoc, updateDoc, collection, query,
    where, orderBy, limit, onSnapshot, Timestamp, serverTimestamp, arrayUnion
} from "firebase/firestore";
import RestaurantForm from "@/app/admin/components/RestaurantForm";
import { LogOut, Loader2, Bell, Check, X, AlertTriangle, Truck, Clock, UtensilsCrossed, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useFcmToken } from "@/app/hooks/useFcmToken";
import { motion, AnimatePresence } from "framer-motion";

const TABS = ["orders", "past", "menu"];

const STATUS_LABELS = {
    confirmed: { label: "Confirmed", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    viewed: { label: "Viewed", color: "text-green-400 bg-green-500/10 border-green-500/20" },
    ready_for_delivery: { label: "Ready", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    out_of_stock: { label: "Out of Stock", color: "text-red-400 bg-red-500/10 border-red-500/20" },
    picked_up: { label: "Picked Up", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    delivered: { label: "Delivered", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
};

function OrderCard({ order, restaurantId, onAction, processing }) {
    const restaurantItems = order.items?.filter(i => i.restaurantId === restaurantId) || [];
    const [oosItems, setOosItems] = useState([]);
    const [showOosPicker, setShowOosPicker] = useState(false);
    const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };

    const toggleOosItem = (itemId) => {
        setOosItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
        >
            {/* Header bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/20">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                    {statusInfo.label}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={12} />
                    {order.createdAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
            </div>

            <div className="p-5 space-y-4">
                {/* Items */}
                <div className="space-y-2">
                    {restaurantItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <span className="font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 w-7 h-7 flex items-center justify-center rounded-lg text-sm shrink-0">
                                {item.quantity}
                            </span>
                            <span className="text-white font-semibold text-sm">{item.name}</span>
                        </div>
                    ))}
                </div>

                {/* Custom Instructions — always visible */}
                {order.instructions && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-black text-yellow-400/70 uppercase tracking-widest mb-1">Special Instructions</p>
                        <p className="text-sm text-yellow-200">{order.instructions}</p>
                    </div>
                )}

                {/* Out-of-stock item picker */}
                <AnimatePresence>
                    {showOosPicker && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2"
                        >
                            <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">Select unavailable items:</p>
                            {restaurantItems.map((item, idx) => (
                                <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${oosItems.includes(item.id || item.name)
                                        ? "bg-red-500 border-red-500"
                                        : "border-white/20 group-hover:border-red-400"
                                        }`}>
                                        {oosItems.includes(item.id || item.name) && <Check size={12} className="text-white" />}
                                    </div>
                                    <span className="text-sm text-white">{item.name} ×{item.quantity}</span>
                                </label>
                            ))}
                            <div className="flex gap-2 pt-2">
                                <button
                                    disabled={oosItems.length === 0 || processing === order.id}
                                    onClick={() => onAction(order, "out_of_stock", oosItems)}
                                    className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                                >
                                    {processing === order.id ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                                    Confirm OOS
                                </button>
                                <button
                                    onClick={() => { setShowOosPicker(false); setOosItems([]); }}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Action Buttons */}
                {(order.status === "confirmed" || order.status === "viewed" || order.status === "ready_for_delivery") && !showOosPicker && (
                    <div className="flex flex-col gap-2 pt-1">
                        {order.status === "confirmed" && (
                            <button
                                disabled={processing === order.id}
                                onClick={() => onAction(order, "viewed")}
                                className="w-full bg-green-600/20 hover:bg-green-600 border border-green-500/30 text-green-400 hover:text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                {processing === order.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Mark as Viewed
                            </button>
                        )}
                        {(order.status === "confirmed" || order.status === "viewed") && (
                            <button
                                disabled={processing === order.id}
                                onClick={() => onAction(order, "ready_for_delivery")}
                                className="w-full bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-400 hover:text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                {processing === order.id ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                                Ready for Delivery
                            </button>
                        )}
                        <button
                            disabled={processing === order.id}
                            onClick={() => setShowOosPicker(true)}
                            className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <UtensilsCrossed size={16} /> Out of Stock
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default function PartnerDashboard() {
    const { user, loading, logout } = useAdminAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("orders");
    const [restaurantData, setRestaurantData] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [liveOrders, setLiveOrders] = useState([]);
    const [pastOrders, setPastOrders] = useState([]);
    const [processing, setProcessing] = useState(null);
    const isInitialLoad = useRef(true);
    const audioRef = useRef(null);

    useFcmToken(user ?? null);

    // Audio setup
    useEffect(() => {
        audioRef.current = new Audio("/orderNotif.mpeg");
        audioRef.current.preload = "auto";
        const unlock = () => {
            audioRef.current?.play().then(() => {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }).catch(() => { });
            document.removeEventListener("click", unlock);
        };
        document.addEventListener("click", unlock);
        return () => document.removeEventListener("click", unlock);
    }, []);

    const playNotificationSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => { console.log("Audio play failed"); });
        }
    }, []);

    // Live orders listener (confirmed / viewed / ready_for_delivery) — oldest first
    useEffect(() => {
        if (!user?.restaurantId) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, "orders"),
            where("restaurantIds", "array-contains", user.restaurantId),
            where("status", "in", ["confirmed", "viewed", "ready_for_delivery"]),
            where("createdAt", ">=", Timestamp.fromDate(todayStart)),
            orderBy("createdAt", "asc"),
            limit(100)
        );

        const unsub = onSnapshot(q, (snap) => {
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() }));
            if (isInitialLoad.current) {
                isInitialLoad.current = false;
            } else if (snap.docChanges().some(c => c.type === "added")) {
                playNotificationSound();
                toast("New Order!", { icon: "🔔" });
            }
            setLiveOrders(docs);
        });
        return () => unsub();
    }, [user, playNotificationSound]);

    // Past orders listener (out_of_stock / picked_up / delivered) — newest first
    useEffect(() => {
        if (!user?.restaurantId) return;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, "orders"),
            where("restaurantIds", "array-contains", user.restaurantId),
            where("status", "in", ["out_of_stock", "picked_up", "delivered"]),
            where("createdAt", ">=", Timestamp.fromDate(todayStart)),
            orderBy("createdAt", "desc"),
            limit(100)
        );

        const unsub = onSnapshot(q, (snap) => {
            setPastOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() })));
        });
        return () => unsub();
    }, [user]);

    // Auth redirect + restaurant fetch
    useEffect(() => {
        if (!loading && !user) { router.push("/partner/login"); return; }
        if (user?.restaurantId) {
            getDoc(doc(db, "restaurants", user.restaurantId)).then(snap => {
                if (snap.exists()) setRestaurantData({ id: snap.id, ...snap.data() });
                else toast.error("Restaurant not found.");
            }).catch(() => toast.error("Failed to load restaurant.")).finally(() => setIsFetching(false));
        } else if (user && !user.restaurantId) {
            toast.error("No restaurant assigned to your account.");
            setIsFetching(false);
        }
    }, [user, loading, router]);

    const handleAction = async (order, action, oosItemIds = []) => {
        setProcessing(order.id);
        try {
            const updates = { status: action };

            if (action === "viewed") {
                updates.partnerViewedAt = serverTimestamp();
            } else if (action === "ready_for_delivery") {
                updates.readyAt = serverTimestamp();
            } else if (action === "out_of_stock") {
                updates.outOfStockItems = oosItemIds;
                updates.outOfStockAt = serverTimestamp();

                // Mark these items as OOS in the restaurant doc for today
                if (oosItemIds.length > 0 && user.restaurantId) {
                    await updateDoc(doc(db, "restaurants", user.restaurantId), {
                        outOfStockToday: arrayUnion(...oosItemIds)
                    });
                }
            }

            await updateDoc(doc(db, "orders", order.id), updates);

            // Notify admin via FCM
            if (action !== "viewed" || true) { // Always notify admin
                user.getIdToken().then(idToken => {
                    supabase.functions.invoke("send-fcm-notification", {
                        body: { role: "admin", orderId: order.id, event: action },
                        headers: { Authorization: `Bearer ${idToken}` },
                    }).catch(() => { });
                }).catch(() => { });
            }

            const labels = { viewed: "Marked as Viewed", ready_for_delivery: "Marked as Ready!", out_of_stock: "Order marked Out of Stock" };
            toast.success(labels[action] || "Updated");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update order");
        } finally {
            setProcessing(null);
        }
    };

    const handleSave = async (data) => {
        if (!user?.restaurantId) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "restaurants", user.restaurantId), data, { merge: true });
            setRestaurantData(prev => ({ ...prev, ...data }));
            toast.success("Saved!");
        } catch { toast.error("Failed to save."); }
        finally { setIsSaving(false); }
    };

    if (loading || isFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white bg-black">
                <Loader2 className="animate-spin mr-2" /> Loading...
            </div>
        );
    }

    if (!user) return null;

    const tabConfig = [
        {
            id: "orders", label: "Live Orders",
            badge: liveOrders.length > 0 ? liveOrders.length : null,
            badgeColor: "bg-orange-500"
        },
        {
            id: "past", label: "Past Orders",
            badge: pastOrders.length > 0 ? pastOrders.length : null,
            badgeColor: "bg-gray-500"
        },
        { id: "menu", label: "Menu & Settings" },
    ];

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-black text-white">Partner Dashboard</h1>
                        <p className="text-xs text-gray-500">{restaurantData?.name || "..."}</p>
                    </div>
                    <button
                        onClick={async () => { await logout(); router.push("/partner/login"); }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="max-w-5xl mx-auto px-4 pb-0 flex gap-1">
                    {tabConfig.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative px-4 py-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${activeTab === tab.id
                                ? "text-white border-orange-500"
                                : "text-gray-500 border-transparent hover:text-gray-300"
                                }`}
                        >
                            {tab.label}
                            {tab.badge && (
                                <span className={`${tab.badgeColor} text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 pt-6">
                {/* LIVE ORDERS TAB */}
                {activeTab === "orders" && (
                    <div>
                        {liveOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-5 text-gray-600">
                                    <Bell size={36} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-400 mb-2">No active orders</h3>
                                <p className="text-gray-600 text-sm">New confirmed orders will appear here automatically.</p>
                                <div className="mt-6 flex items-center gap-2 text-xs text-gray-700">
                                    <span className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
                                    Listening for orders...
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <AnimatePresence>
                                    {liveOrders.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            restaurantId={user.restaurantId}
                                            onAction={handleAction}
                                            processing={processing}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                )}

                {/* PAST ORDERS TAB */}
                {activeTab === "past" && (
                    <div>
                        {pastOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-5 text-gray-600">
                                    <Check size={36} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-400">No past orders today</h3>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {pastOrders.map(order => {
                                    const restaurantItems = order.items?.filter(i => i.restaurantId === user.restaurantId) || [];
                                    const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
                                    return (
                                        <div key={order.id} className="bg-white/3 border border-white/5 rounded-2xl overflow-hidden opacity-70">
                                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                                                    {statusInfo.label}
                                                </span>
                                                <span className="text-xs text-gray-600">
                                                    {order.createdAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                            <div className="p-5 space-y-2">
                                                {restaurantItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <span className="font-bold text-gray-500 bg-white/5 w-7 h-7 flex items-center justify-center rounded-lg text-sm shrink-0">
                                                            {item.quantity}
                                                        </span>
                                                        <span className={`text-sm font-medium ${order.status === "out_of_stock" && order.outOfStockItems?.includes(item.id || item.name)
                                                            ? "line-through text-red-400/60"
                                                            : "text-gray-300"}`}
                                                        >
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                ))}
                                                {order.instructions && (
                                                    <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl px-3 py-2 mt-2">
                                                        <p className="text-xs text-yellow-200/60">{order.instructions}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* MENU TAB */}
                {activeTab === "menu" && (
                    <div>
                        {restaurantData ? (
                            <RestaurantForm
                                initialData={restaurantData}
                                onSave={handleSave}
                                onCancel={() => {
                                    getDoc(doc(db, "restaurants", user.restaurantId)).then(snap => {
                                        if (snap.exists()) setRestaurantData({ id: snap.id, ...snap.data() });
                                    });
                                    toast("Changes discarded.");
                                }}
                                isSaving={isSaving}
                                isPartnerView={true}
                            />
                        ) : (
                            <div className="text-center py-20 text-gray-400">No restaurant data found.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
