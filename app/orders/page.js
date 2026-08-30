"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Package, RotateCcw, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";

import Navbar from "../components/Navbar";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { useCart } from "@/app/context/CartContext";
import { fetchUserOrders } from "@/lib/repositories";
import { displayOrderNumber } from "@/lib/formatters";
import { formatDeliverySlot } from "@/lib/preOrderSlots";
import { partitionOrders, getRecentlyOrderedItems, customerStatusLabel } from "@/lib/orderHistory";

const STATUS_STYLES = {
    placed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    confirmed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    viewed: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    ready_for_delivery: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    out_of_stock: "text-red-400 bg-red-500/10 border-red-500/20",
    oos_acknowledged: "text-red-400 bg-red-500/10 border-red-500/20",
    picked_up: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    delivered: "text-green-400 bg-green-500/10 border-green-500/20",
    cancelled: "text-gray-400 bg-gray-500/10 border-gray-500/20",
};

const formatDate = (date) =>
    date
        ? date.toLocaleDateString([], { day: "numeric", month: "short" }) +
          " · " +
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

function OrderCard({ order }) {
    const style = STATUS_STYLES[order.status] || STATUS_STYLES.placed;

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-black tracking-widest text-white shrink-0">
                        {displayOrderNumber(order)}
                    </span>
                    <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${style}`}
                    >
                        {customerStatusLabel(order.status)}
                    </span>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                    {formatDate(order.createdAt)}
                </span>
            </div>

            <div className="p-5 space-y-3">
                {order.deliverySlot && (
                    <p className="text-xs text-cyan-400 font-bold">
                        Delivery: {formatDeliverySlot(order.deliverySlot)}
                    </p>
                )}

                <div className="space-y-1.5">
                    {order.items?.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                            <span className="font-bold text-gray-500 shrink-0">
                                {item.quantity}×
                            </span>
                            <div className="min-w-0">
                                <p className="text-gray-200">
                                    {item.name}
                                    {item.variant?.name && (
                                        <span className="text-gray-500">
                                            {" "}
                                            ({item.variant.name})
                                        </span>
                                    )}
                                </p>
                                <p className="text-[10px] text-gray-600">{item.restaurantName}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                        {order.campus}
                        {order.address ? ` · ${order.address}` : ""}
                    </span>
                    <span className="font-black text-white">₹{order.finalTotal}</span>
                </div>
            </div>
        </div>
    );
}

export default function OrdersPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useUserAuth();
    const { addToCart, setIsCartOpen } = useCart();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            setOrders(await fetchUserOrders(user.uid));
            setFailed(false);
        } catch (error) {
            console.error("Failed to load order history:", error);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    // Signed-out visitors have no history to show — orders are readable only by
    // the account that placed them.
    useEffect(() => {
        if (!authLoading && !user) router.push("/login");
    }, [authLoading, user, router]);

    const { active, past } = partitionOrders(orders);
    const recentItems = getRecentlyOrderedItems(orders);

    const reorder = (item) => {
        addToCart(item, 1);
        setIsCartOpen(true);
        toast.success(`${item.name} added to cart`);
    };

    if (authLoading || (loading && orders.length === 0)) {
        return (
            <div className="min-h-screen bg-black text-white">
                <Navbar />
                <div className="flex items-center justify-center pt-40">
                    <Loader2 size={40} className="animate-spin text-orange-500" />
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-black text-white pb-24">
            <Navbar />

            <div className="max-w-3xl mx-auto px-4 py-8 pt-24">
                <Link
                    href="/"
                    className="inline-flex items-center text-gray-400 hover:text-white text-sm font-medium transition-colors mb-4"
                >
                    <ArrowLeft size={16} className="mr-2" /> Back to Store
                </Link>

                <h1 className="text-4xl font-black tracking-tight mb-8">My Orders</h1>

                {failed && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-6">
                        <p className="text-sm text-red-300 mb-3">
                            Couldn&apos;t load your orders. Check your connection and try again.
                        </p>
                        <button
                            onClick={load}
                            className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!failed && orders.length === 0 && (
                    <div className="text-center py-20">
                        <Package size={48} className="mx-auto text-gray-700 mb-4" />
                        <p className="text-gray-400 font-medium mb-6">
                            You haven&apos;t placed any orders yet.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                        >
                            <ShoppingBag size={16} /> Browse restaurants
                        </Link>
                    </div>
                )}

                {recentItems.length > 0 && (
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">
                            Order again
                        </h2>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {recentItems.map((item) => (
                                <div
                                    key={`${item.restaurantId}:${item.id}`}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[200px] flex flex-col gap-2"
                                >
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-white truncate">
                                            {item.name}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate">
                                            {item.restaurantName}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between mt-auto pt-2">
                                        <span className="text-sm font-black text-white">
                                            ₹{item.price}
                                        </span>
                                        <button
                                            onClick={() => reorder(item)}
                                            className="flex items-center gap-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <RotateCcw size={12} /> Reorder
                                        </button>
                                    </div>
                                    {item.timesOrdered > 1 && (
                                        <p className="text-[10px] text-gray-600">
                                            Ordered {item.timesOrdered} times
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.section>
                )}

                {active.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">
                            In progress
                        </h2>
                        <div className="space-y-4">
                            {active.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    </section>
                )}

                {past.length > 0 && (
                    <section>
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-4">
                            Past orders
                        </h2>
                        <div className="space-y-4">
                            {past.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
