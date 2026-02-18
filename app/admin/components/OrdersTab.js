
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Clock, MapPin, Phone, User, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function OrdersTab() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Listen for "placed" orders from today
        const q = query(
            collection(db, "orders"),
            where("status", "==", "placed"),
            where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
            orderBy("createdAt", "asc") // Oldest first for fairness
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
            setOrders(newOrders);
            setLoading(false);
        }, (error) => {
            console.error("Orders listener error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAction = async (orderId, action) => {
        setProcessingId(orderId);
        try {
            const newStatus = action === "confirm" ? "confirmed" : "cancelled";
            await updateDoc(doc(db, "orders", orderId), {
                status: newStatus,
                adminProcessedAt: serverTimestamp()
            });
            toast.success(`Order ${action === "confirm" ? "Confirmed" : "Cancelled"}`);
        } catch (error) {
            console.error("Error updating order:", error);
            toast.error("Failed to update order");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-gray-500">
                <Loader2 className="animate-spin mr-2" /> Loading orders...
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-black text-white mb-8 flex items-center gap-3">
                Live Orders
                <span className="bg-orange-600 text-sm px-3 py-1 rounded-full">{orders.length}</span>
            </h2>

            {orders.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-500">
                        <Check size={40} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">All Caught Up!</h3>
                    <p className="text-gray-400">There are no pending orders to verify right now.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    <AnimatePresence>
                        {orders.map((order) => (
                            <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white/5 border border-white/10 p-6 rounded-3xl hover:border-orange-500/30 transition-all shadow-xl"
                            >
                                <div className="flex flex-col md:flex-row gap-6 justify-between">
                                    {/* Order Details */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-orange-500/20 animate-pulse">
                                                New Order
                                            </span>
                                            <span className="text-gray-400 text-sm flex items-center gap-1">
                                                <Clock size={14} />
                                                {order.createdAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {order.items?.map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-3">
                                                    <span className="font-bold text-white bg-white/10 w-6 h-6 flex items-center justify-center rounded text-sm shrink-0">
                                                        {item.quantity}
                                                    </span>
                                                    <div>
                                                        <p className="font-bold text-white text-lg">{item.name}</p>
                                                        <p className="text-xs text-gray-400">{item.restaurantName}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* User Info */}
                                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <User size={16} className="text-gray-500" />
                                                <span className="font-bold">{order.name || "N/A"}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-300">
                                                <Phone size={16} className="text-gray-500" />
                                                <span>{order.phone || "N/A"}</span>
                                            </div>
                                            <div className="flex items-start gap-2 text-gray-300 col-span-full">
                                                <MapPin size={16} className="text-gray-500 mt-0.5 shrink-0" />
                                                <span>
                                                    <span className="text-white font-bold">{order.campus}</span>
                                                    {order.address && <span className="text-gray-400"> • {order.address}</span>}
                                                </span>
                                            </div>
                                            {order.instructions && (
                                                <div className="col-span-full bg-white/5 p-3 rounded-xl text-yellow-200/80 text-xs border border-white/5">
                                                    <span className="font-bold uppercase text-[10px] tracking-wider opacity-70 block mb-1">Note:</span>
                                                    {order.instructions}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col justify-between items-end gap-6 border-l border-white/5 pl-6 md:min-w-[200px]">
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400 mb-1">Total Amount</p>
                                            <p className="text-3xl font-black text-white">₹{order.finalTotal || order.total || "0"}</p>
                                        </div>

                                        <div className="flex flex-col gap-3 w-full">
                                            <button
                                                onClick={() => handleAction(order.id, "confirm")}
                                                disabled={processingId === order.id}
                                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processingId === order.id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                                                Confirm Order
                                            </button>
                                            <button
                                                onClick={() => handleAction(order.id, "cancel")}
                                                disabled={processingId === order.id}
                                                className="w-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 hover:border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Ignore / Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
