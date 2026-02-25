
import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
    Check, X, Clock, MapPin, Phone, User, Loader2,
    AlertTriangle, Truck, Eye, Package
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { formatTime } from "@/lib/dateUtils";

const SUB_TABS = [
    { id: "pending", label: "Pending" },
    { id: "inprogress", label: "In Progress" },
    { id: "past", label: "Picked Up / Done" },
];

const STATUS_INFO = {
    confirmed: { label: "Confirmed", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    viewed: { label: "Viewed by Partner", color: "text-green-400 bg-green-500/10 border-green-500/20" },
    ready_for_delivery: { label: "Ready for Delivery", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    out_of_stock: { label: "Out of Stock", color: "text-red-400 bg-red-500/10 border-red-500/20" },
    picked_up: { label: "Picked Up", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
    delivered: { label: "Delivered", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
};

function TimeAgo({ date }) {
    if (!date) return null;
    return (
        <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock size={11} />
            {formatTime(date)}
        </span>
    );
}

function OrderCard({ order, showActions = false, user }) {
    const [processingId, setProcessingId] = useState(null);
    const statusInfo = STATUS_INFO[order.status] || { label: order.status, color: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
    const isOos = order.status === "out_of_stock";

    const handleAction = async (orderId, action) => {
        setProcessingId(orderId);
        try {
            const newStatus = action === "confirm" ? "confirmed" : "cancelled";
            await updateDoc(doc(db, "orders", orderId), {
                status: newStatus,
                adminProcessedAt: serverTimestamp()
            });
            toast.success(`Order ${action === "confirm" ? "Confirmed" : "Cancelled"}`);

            if (action === "confirm" && user && order?.restaurantIds?.length > 0) {
                user.getIdToken().then(idToken => {
                    supabase.functions.invoke("send-fcm-notification", {
                        body: { role: "partner", restaurantIds: order.restaurantIds, orderId },
                        headers: { Authorization: `Bearer ${idToken}` },
                    }).catch(err => console.warn("Partner FCM error:", err));
                }).catch(() => { });
            }
        } catch {
            toast.error("Failed to update order");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`border rounded-3xl overflow-hidden transition-all shadow-xl ${isOos
                ? "bg-red-950/20 border-red-500/30"
                : "bg-white/5 border-white/10 hover:border-orange-500/30"
                }`}
        >
            {/* OOS banner */}
            {isOos && (
                <div className="bg-red-500/20 px-5 py-2 flex items-center gap-2 border-b border-red-500/20">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs font-black text-red-400 uppercase tracking-widest">Out of Stock</span>
                    {order.outOfStockItems?.length > 0 && (
                        <span className="text-xs text-red-300/70">— {order.outOfStockItems.join(", ")}</span>
                    )}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-0 justify-between">
                {/* Left: order details */}
                <div className="flex-1 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                            {statusInfo.label}
                        </span>
                        <TimeAgo date={order.createdAt} />
                    </div>

                    {/* Items */}
                    <div className="space-y-2">
                        {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <span className={`font-bold w-6 h-6 flex items-center justify-center rounded text-sm shrink-0 ${isOos && order.outOfStockItems?.includes(item.id || item.name)
                                    ? "bg-red-500/20 text-red-400 line-through"
                                    : "bg-white/10 text-white"
                                    }`}>
                                    {item.quantity}
                                </span>
                                <div>
                                    <p className={`font-bold text-sm ${isOos && order.outOfStockItems?.includes(item.id || item.name) ? "text-red-400/60 line-through" : "text-white"}`}>
                                        {item.name}
                                    </p>
                                    <p className="text-[10px] text-gray-500">{item.restaurantName}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Instructions */}
                    {order.instructions && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                            <p className="text-[10px] font-black text-yellow-400/70 uppercase tracking-widest mb-0.5">Note</p>
                            <p className="text-xs text-yellow-200">{order.instructions}</p>
                        </div>
                    )}

                    {/* Customer info */}
                    <div className="pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {order.name && (
                            <div className="flex items-center gap-2 text-gray-300">
                                <User size={14} className="text-gray-500" />
                                <span className="font-bold">{order.name}</span>
                            </div>
                        )}
                        {order.phone && (
                            <div className="flex items-center gap-2 text-gray-300">
                                <Phone size={14} className="text-gray-500" />
                                <span>{order.phone}</span>
                            </div>
                        )}
                        <div className="flex items-start gap-2 text-gray-300 col-span-full">
                            <MapPin size={14} className="text-gray-500 mt-0.5 shrink-0" />
                            <span>
                                <span className="text-white font-bold">{order.campus}</span>
                                {order.address && <span className="text-gray-400"> · {order.address}</span>}
                            </span>
                        </div>
                    </div>

                    {/* Partner activity timestamps — only for in-progress */}
                    {(order.partnerViewedAt || order.readyAt || order.pickedUpAt) && (
                        <div className="flex flex-wrap gap-3 pt-1">
                            {order.partnerViewedAt && (
                                <span className="text-[10px] text-green-400/70 flex items-center gap-1">
                                    <Eye size={10} /> Viewed {formatTime(order.partnerViewedAt)}
                                </span>
                            )}
                            {order.readyAt && (
                                <span className="text-[10px] text-purple-400/70 flex items-center gap-1">
                                    <Truck size={10} /> Ready {formatTime(order.readyAt)}
                                </span>
                            )}
                            {order.pickedUpAt && (
                                <span className="text-[10px] text-orange-400/70 flex items-center gap-1">
                                    <Package size={10} /> Picked up {formatTime(order.pickedUpAt)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: amount + actions (only for pending) */}
                {showActions && (
                    <div className="flex flex-col justify-between items-end gap-5 border-t md:border-t-0 md:border-l border-white/5 p-6 md:min-w-[190px]">
                        <div className="text-right">
                            <p className="text-xs text-gray-400 mb-1">Total</p>
                            <p className="text-3xl font-black text-white">₹{order.finalTotal || order.total || "0"}</p>
                        </div>
                        <div className="flex flex-col gap-3 w-full">
                            <button
                                onClick={() => handleAction(order.id, "confirm")}
                                disabled={processingId === order.id}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {processingId === order.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Confirm Order
                            </button>
                            <button
                                onClick={() => handleAction(order.id, "cancel")}
                                disabled={processingId === order.id}
                                className="w-full bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-white/10 hover:border-red-500/30 disabled:opacity-50"
                            >
                                <X size={16} /> Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-5 text-gray-600">
                <Check size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">All clear!</h3>
            <p className="text-gray-500 text-sm">{message}</p>
        </div>
    );
}

export default function OrdersTab({ orders, inProgressOrders = [], pastOrders = [], loading, user }) {
    const [subTab, setSubTab] = useState("pending");

    // OOS orders float to top within the in-progress list
    const sortedInProgress = [...inProgressOrders].sort((a, b) => {
        if (a.status === "out_of_stock" && b.status !== "out_of_stock") return -1;
        if (b.status === "out_of_stock" && a.status !== "out_of_stock") return 1;
        return 0;
    });

    const tabCounts = {
        pending: orders.length,
        inprogress: inProgressOrders.length,
        past: pastOrders.length,
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
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black text-white">Orders</h2>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 mb-8 border-b border-white/10">
                {SUB_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${subTab === tab.id
                            ? "text-white border-orange-500"
                            : "text-gray-500 border-transparent hover:text-gray-300"
                            }`}
                    >
                        {tab.label}
                        {tabCounts[tab.id] > 0 && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab.id === "pending" ? "bg-orange-500 text-white" :
                                tab.id === "inprogress" ? "bg-blue-500/20 text-blue-400" :
                                    "bg-gray-500/20 text-gray-400"
                                }`}>
                                {tabCounts[tab.id]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Pending sub-tab */}
            {subTab === "pending" && (
                <div className="grid gap-6">
                    <AnimatePresence>
                        {orders.length === 0
                            ? <EmptyState message="No pending orders to confirm right now." />
                            : orders.map(order => (
                                <OrderCard key={order.id} order={order} showActions user={user} />
                            ))
                        }
                    </AnimatePresence>
                </div>
            )}

            {/* In-progress sub-tab */}
            {subTab === "inprogress" && (
                <div className="grid gap-6">
                    <AnimatePresence>
                        {sortedInProgress.length === 0
                            ? <EmptyState message="No orders currently being prepared." />
                            : sortedInProgress.map(order => (
                                <OrderCard key={order.id} order={order} user={user} />
                            ))
                        }
                    </AnimatePresence>
                </div>
            )}

            {/* Past sub-tab */}
            {subTab === "past" && (
                <div className="grid gap-6">
                    <AnimatePresence>
                        {pastOrders.length === 0
                            ? <EmptyState message="No completed orders today yet." />
                            : pastOrders.map(order => (
                                <OrderCard key={order.id} order={order} user={user} />
                            ))
                        }
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
