"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, limit, onSnapshot } from "firebase/firestore";
import RestaurantForm from "@/app/admin/components/RestaurantForm";
import { LogOut, Loader2, Bell, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function PartnerDashboard() {
    const { user, loading, logout } = useAdminAuth();
    const router = useRouter();
    const [restaurantData, setRestaurantData] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [orders, setOrders] = useState([]);
    const [viewedOrders, setViewedOrders] = useState(() => {
        if (typeof window === "undefined") return new Set();
        try {
            const stored = localStorage.getItem("viewedOrders");
            return stored ? new Set(JSON.parse(stored)) : new Set();
        } catch { return new Set(); }
    });
    const isInitialLoad = useRef(true);

    const playNotificationSound = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.log("Sound play failed:", e);
        }
    }, []);

    const markAsViewed = useCallback((orderId) => {
        setViewedOrders(prev => {
            const next = new Set(prev);
            next.add(orderId);
            localStorage.setItem("viewedOrders", JSON.stringify([...next]));
            return next;
        });
    }, []);

    // Live Orders Listener
    useEffect(() => {
        if (!user?.restaurantId) return;

        const q = query(
            collection(db, "orders"),
            where("restaurantIds", "array-contains", user.restaurantId),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));

            newOrders.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

            if (isInitialLoad.current) {
                isInitialLoad.current = false;
            } else if (snapshot.docChanges().some(change => change.type === 'added')) {
                playNotificationSound();
                toast("New Order Received!", { icon: "🔔" });
            }

            setOrders(newOrders);
        }, (error) => {
            console.error("Orders listener error:", error);
        });

        return () => unsubscribe();
    }, [user, playNotificationSound]);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/partner/login");
        } else if (user && user.restaurantId) {
            fetchRestaurant(user.restaurantId);
        } else if (user && !user.restaurantId) {
            // User is logged in but has no restaurant ID (maybe purely admin? or error)
            // Typically admins shouldn't be here, but if they are, they see nothing or need to go to admin panel.
            // For now, let's treat it as no access.
            toast.error("No restaurant assigned to your account.");
            setIsFetching(false);
        }
    }, [user, loading, router]);

    const fetchRestaurant = async (id) => {
        try {
            const docRef = doc(db, "restaurants", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setRestaurantData({ id: docSnap.id, ...docSnap.data() });
            } else {
                toast.error("Restaurant not found.");
            }
        } catch (error) {
            console.error("Error fetching restaurant:", error);
            toast.error("Failed to load restaurant details.");
        } finally {
            setIsFetching(false);
        }
    };

    const handleSave = async (data) => {
        if (!user?.restaurantId) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "restaurants", user.restaurantId), data, { merge: true });
            toast.success("Changes saved successfully!");
            // Refresh local data
            setRestaurantData(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error("Error saving restaurant:", error);
            toast.error("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push("/partner/login");
    };

    if (loading || isFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <Loader2 className="animate-spin mr-2" /> Loading...
            </div>
        );
    }

    if (!user) return null; // Redirecting...

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Partner Dashboard</h1>
                        <p className="text-gray-400">Manage your restaurant: <span className="text-orange-400 font-bold">{restaurantData?.name || "Loading..."}</span></p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>

                {/* Live Orders Section */}
                <div className="mb-12">
                    {(() => {
                        const unviewedCount = orders.filter(o => !viewedOrders.has(o.id)).length; return (
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <div className="relative">
                                    <Bell className={`text-orange-500 ${unviewedCount > 0 ? 'animate-bounce' : ''}`} fill={unviewedCount > 0 ? "currentColor" : "none"} />
                                    {unviewedCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />}
                                </div>
                                Live Orders
                                <span className="bg-white/10 text-sm px-3 py-1 rounded-full text-gray-300">{orders.length}</span>
                                {unviewedCount > 0 && <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">{unviewedCount} new</span>}
                            </h2>);
                    })()}

                    {orders.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center dashed-border">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-gray-600">
                                <Bell size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-400">No new orders yet</h3>
                            <p className="text-gray-600 mt-2">New orders will appear here automatically with a notification sound.</p>
                            <div className="mt-8 flex gap-2 text-xs text-gray-700">
                                <span className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></span>
                                System is live and listening...
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {orders.map(order => {
                                const restaurantItems = order.items?.filter(i => i.restaurantId === user.restaurantId) || [];
                                const isViewed = viewedOrders.has(order.id);

                                return (
                                    <div key={order.id} className={`border p-5 rounded-2xl shadow-xl relative overflow-hidden transition-all ${isViewed
                                        ? 'bg-gray-900/50 border-white/5 opacity-60'
                                        : 'bg-gradient-to-br from-gray-900 to-gray-800 border-white/10 hover:border-orange-500/30'
                                        }`}>
                                        <div className={`absolute top-0 left-0 w-1 h-full ${isViewed ? 'bg-green-600' : 'bg-orange-500'}`}></div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                {isViewed && <Check size={14} className="text-green-500" />}
                                                <p className={`text-xs font-bold inline-block px-2 py-0.5 rounded uppercase tracking-wider ${isViewed ? 'text-green-400 bg-green-500/10' : 'text-orange-400 bg-orange-500/10'
                                                    }`}>
                                                    {isViewed ? 'Viewed' : (order.status || 'Placed')}
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-500 font-mono">
                                                {order.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {restaurantItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3 text-sm">
                                                    <span className="font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded text-xs">x{item.quantity}</span>
                                                    <span className="text-gray-200">{item.name}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {!isViewed && (
                                            <button
                                                onClick={() => markAsViewed(order.id)}
                                                className="mt-4 w-full bg-white/5 hover:bg-green-500/20 border border-white/10 hover:border-green-500/30 text-gray-400 hover:text-green-400 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                                            >
                                                <Check size={14} /> Mark as Viewed
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {restaurantData ? (
                    <RestaurantForm
                        initialData={restaurantData}
                        onSave={handleSave}
                        onCancel={() => {
                            // Reset form or maybe just do nothing since there's nowhere to go back to?
                            // Or maybe reload from server?
                            fetchRestaurant(user.restaurantId);
                            toast.success("Changes discarded.");
                        }}
                        isSaving={isSaving}
                        isPartnerView={true}
                    />
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                        <p className="text-gray-400">No restaurant data found. Please contact support.</p>
                        <p className="text-xs text-gray-600 mt-2">ID: {user.restaurantId}</p>
                    </div>
                )}
            </div>
        </div >
    );
}
