"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import RestaurantForm from "@/app/admin/components/RestaurantForm";
import { LogOut, Loader2, Bell } from "lucide-react";
import toast from "react-hot-toast";

export default function PartnerDashboard() {
    const { user, loading, logout } = useAdminAuth();
    const router = useRouter();
    const [restaurantData, setRestaurantData] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [orders, setOrders] = useState([]);
    // Simple "Ding" sound (Base64)
    const [audio] = useState(typeof Audio !== "undefined" ? new Audio("data:audio/mp3;base64,//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq") : null);

    // Sound logic
    useEffect(() => {
        if (audio) {
            audio.load();
        }
    }, [audio]);

    // Live Orders Listener
    useEffect(() => {
        if (!user?.restaurantId) return;

        // Query: Orders containing this restaurant ID, created recently (or just last 20)
        // Note: 'array-contains' requires an index sometimes, but usually works for simple arrays.
        // We order by createdAt desc to get latest.
        const q = query(
            collection(db, "orders"),
            where("restaurantIds", "array-contains", user.restaurantId),
            orderBy("createdAt", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));

            // Simple new order detection: if we have more orders than before, or the top order is new
            // For now, just set state. In a real app we'd track "last viewed" or similar.
            if (snapshot.docChanges().some(change => change.type === 'added')) {
                // Only play sound if it's a *fresh* add, not initial load, but snapshot doesn't distinguish easily without metadata.
                // Actually snapshot.metadata.fromCache is false for new server data.
                // Let's just play sound if the list grows and it's not the very first load
                if (orders.length > 0 && newOrders.length > orders.length) {
                    audio?.play().catch(e => console.log("Audio play failed", e));
                    toast("New Order Received!", { icon: "🔔" });
                }
            }

            setOrders(newOrders);
        }, (error) => {
            console.error("Orders listener error:", error);
        });

        return () => unsubscribe();
    }, [user, audio, orders.length]);

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
                {orders.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <Bell className="text-orange-500" /> Live Orders ({orders.length})
                        </h2>
                        <div className="grid gap-4">
                            {orders.map(order => (
                                <div key={order.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-white">{order.customer?.name}</h3>
                                            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded font-bold uppercase">{order.status}</span>
                                        </div>
                                        <p className="text-gray-400 text-sm mb-1">{order.customer?.phone}</p>
                                        <p className="text-gray-500 text-xs mb-4">{order.customer?.campus}, {order.customer?.address}</p>

                                        <div className="space-y-1">
                                            {order.items?.filter(i => i.restaurantId === user.restaurantId).map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm text-gray-300">
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span>₹{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                            <span className="text-xs text-gray-500">{order.createdAt?.toLocaleString()}</span>
                                            {/* Note: Total shown is for the whole order, maybe we should calculate this restaurant's subtotal? */}
                                            {/* Let's show specific subtotal if possible, or just the item list total */}
                                            <span className="font-bold text-white">
                                                Total: ₹{order.items?.filter(i => i.restaurantId === user.restaurantId).reduce((sum, i) => sum + (i.price * i.quantity), 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
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
