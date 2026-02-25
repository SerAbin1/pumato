"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import {
    collection, query, where, orderBy, onSnapshot, Timestamp,
    runTransaction, doc, serverTimestamp, limit, updateDoc
} from "firebase/firestore";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Truck, MapPin, Package, LogIn, LogOut, Check, Clock, User } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

const STATUS_LABELS = {
    picked_up: { label: "Picked Up", color: "text-orange-400" },
    delivered: { label: "Delivered", color: "text-green-400" },
};

function LoginScreen({ onLogin, loading }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    return (
        <div className="min-h-screen bg-black flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Truck size={32} className="text-orange-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white">Delivery Login</h1>
                    <p className="text-gray-500 text-sm mt-1">Pumato Delivery Dashboard</p>
                </div>
                <div className="space-y-3">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && onLogin(email, password)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-orange-500/50 transition-all"
                    />
                    <button
                        onClick={() => onLogin(email, password)}
                        disabled={loading || !email || !password}
                        className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <LogIn size={20} />}
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DeliveryBoyPage() {
    const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
    const [isDeliveryBoy, setIsDeliveryBoy] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [readyOrders, setReadyOrders] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [claiming, setClaiming] = useState(null);
    const [delivering, setDelivering] = useState(null);

    // Listen for auth state
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (!firebaseUser) { setUser(null); setIsDeliveryBoy(false); return; }
            const result = await firebaseUser.getIdTokenResult();
            if (result.claims.deliveryBoy) {
                setUser(firebaseUser);
                setIsDeliveryBoy(true);
            } else {
                // Logged in but not a delivery boy
                setUser(firebaseUser);
                setIsDeliveryBoy(false);
            }
        });
        return () => unsub();
    }, []);

    const handleLogin = async (email, password) => {
        setAuthLoading(true);
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const result = await cred.user.getIdTokenResult();
            if (!result.claims.deliveryBoy) {
                await signOut(auth);
                toast.error("Access denied. Not a delivery account.");
            }
        } catch (err) {
            toast.error(err.code === "auth/invalid-credential" ? "Invalid email or password" : "Login failed");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        setIsDeliveryBoy(false);
    };

    // Real-time: ready_for_delivery orders
    useEffect(() => {
        if (!user || !isDeliveryBoy) return;
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, "orders"),
            where("status", "==", "ready_for_delivery"),
            where("createdAt", ">=", Timestamp.fromDate(todayStart)),
            orderBy("createdAt", "asc"),
            limit(50)
        );

        const unsub = onSnapshot(q, snap => {
            setReadyOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() })));
        });
        return () => unsub();
    }, [user, isDeliveryBoy]);

    // Real-time: my picked_up orders today
    useEffect(() => {
        if (!user || !isDeliveryBoy) return;
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, "orders"),
            where("deliveryBoyUid", "==", user.uid),
            where("status", "in", ["picked_up", "delivered"]),
            where("createdAt", ">=", Timestamp.fromDate(todayStart)),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsub = onSnapshot(q, snap => {
            setMyOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() })));
        });
        return () => unsub();
    }, [user, isDeliveryBoy]);

    const handlePickup = async (order) => {
        setClaiming(order.id);
        try {
            await runTransaction(db, async (tx) => {
                const ref = doc(db, "orders", order.id);
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error("Order not found");
                if (snap.data().status !== "ready_for_delivery") throw new Error("Order already claimed");

                tx.update(ref, {
                    status: "picked_up",
                    deliveryBoyUid: user.uid,
                    deliveryBoyEmail: user.email,
                    pickedUpAt: serverTimestamp(),
                });
            });
            toast.success("Order picked up! 🚴");
        } catch (err) {
            if (err.message === "Order already claimed") {
                toast.error("Someone else just claimed this order.");
            } else {
                toast.error("Failed to claim order. Try again.");
                console.error(err);
            }
        } finally {
            setClaiming(null);
        }
    };

    const handleDeliver = async (order) => {
        setDelivering(order.id);
        try {
            await runTransaction(db, async (tx) => {
                const ref = doc(db, "orders", order.id);
                const snap = await tx.get(ref);
                if (!snap.exists()) throw new Error("Order not found");
                if (snap.data().status !== "picked_up") throw new Error("Order not in picked_up state");

                tx.update(ref, {
                    status: "delivered",
                    deliveredAt: serverTimestamp(),
                });
            });

            // Notify admin
            user.getIdToken().then(idToken => {
                supabase.functions.invoke("send-fcm-notification", {
                    body: { role: "admin", orderId: order.id, event: "delivered" },
                    headers: { Authorization: `Bearer ${idToken}` },
                }).catch(() => { });
            }).catch(() => { });

            toast.success("Order marked as Delivered! ✅");
        } catch (err) {
            if (err.message === "Order not in picked_up state") {
                toast.error("Order is no longer in picked_up state.");
            } else {
                toast.error("Failed to mark as delivered.");
                console.error(err);
            }
        } finally {
            setDelivering(null);
        }
    };

    // Loading state
    if (user === undefined) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="animate-spin text-orange-500" size={32} />
            </div>
        );
    }

    if (!user || !isDeliveryBoy) {
        return <LoginScreen onLogin={handleLogin} loading={authLoading} />;
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-black/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <Truck size={18} className="text-orange-400" />
                        </div>
                        <div>
                            <h1 className="font-black text-white text-sm">Delivery Dashboard</h1>
                            <p className="text-[10px] text-gray-500">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-6 space-y-8">
                {/* Ready for Pickup */}
                <div>
                    <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                        <Package size={20} className="text-purple-400" />
                        Ready for Pickup
                        {readyOrders.length > 0 && (
                            <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full font-black">{readyOrders.length}</span>
                        )}
                    </h2>

                    {readyOrders.length === 0 ? (
                        <div className="bg-white/3 border border-white/5 rounded-2xl p-12 text-center">
                            <Package size={36} className="text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No orders ready for pickup yet.</p>
                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-700">
                                <span className="w-2 h-2 rounded-full bg-green-500/50 animate-pulse" />
                                Listening...
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AnimatePresence>
                                {readyOrders.map(order => (
                                    <motion.div
                                        key={order.id}
                                        layout
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="bg-white/5 border border-purple-500/20 rounded-2xl overflow-hidden"
                                    >
                                        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-purple-500/5">
                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Ready for Pickup</span>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock size={11} />
                                                {order.createdAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            {/* Items grouped by restaurant */}
                                            <div className="space-y-3">
                                                {Object.entries(
                                                    (order.items || []).reduce((acc, item) => {
                                                        const rName = item.restaurantName || "Restaurant";
                                                        if (!acc[rName]) acc[rName] = [];
                                                        acc[rName].push(item);
                                                        return acc;
                                                    }, {})
                                                ).map(([rName, items]) => (
                                                    <div key={rName}>
                                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">{rName}</p>
                                                        {items.map((item, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 text-sm py-0.5">
                                                                <span className="text-orange-400 font-bold">×{item.quantity}</span>
                                                                <span className="text-gray-200">{item.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Delivery address */}
                                            <div className="flex items-start gap-2 text-sm text-gray-300 bg-white/5 rounded-xl px-3 py-2">
                                                <MapPin size={15} className="text-gray-500 mt-0.5 shrink-0" />
                                                <span>
                                                    <span className="font-bold text-white">{order.campus}</span>
                                                    {order.address && <span className="text-gray-400"> · {order.address}</span>}
                                                </span>
                                            </div>

                                            {order.instructions && (
                                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                                                    <p className="text-xs text-yellow-200">{order.instructions}</p>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handlePickup(order)}
                                                disabled={claiming === order.id}
                                                className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-900/30"
                                            >
                                                {claiming === order.id
                                                    ? <Loader2 size={18} className="animate-spin" />
                                                    : <Truck size={18} />
                                                }
                                                Pick Up Order
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* My Deliveries Today */}
                {myOrders.length > 0 && (
                    <div>
                        <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                            <Check size={20} className="text-green-400" />
                            My Deliveries Today
                            <span className="bg-white/10 text-gray-300 text-xs px-2 py-0.5 rounded-full font-black">{myOrders.length}</span>
                        </h2>
                        <div className="space-y-3">
                            {myOrders.map(order => (
                                <div key={order.id} className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 shrink-0 ${STATUS_LABELS[order.status]?.color}`}>
                                            {order.status === "delivered" ? <Check size={16} /> : <Truck size={16} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">
                                                {order.campus}{order.address ? ` · ${order.address}` : ""}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {order.items?.length} item type(s) · {order.createdAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-black uppercase shrink-0 ${STATUS_LABELS[order.status]?.color}`}>
                                            {STATUS_LABELS[order.status]?.label}
                                        </span>
                                    </div>
                                    {order.status === "picked_up" && (
                                        <button
                                            onClick={() => handleDeliver(order)}
                                            disabled={delivering === order.id}
                                            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                        >
                                            {delivering === order.id
                                                ? <Loader2 size={16} className="animate-spin" />
                                                : <Check size={16} />
                                            }
                                            Mark as Delivered
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
