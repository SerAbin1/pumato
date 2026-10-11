"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getDownloadURL, ref } from "firebase/storage";
import {
    AlertTriangle,
    Check,
    Clock,
    ExternalLink,
    IndianRupee,
    Loader2,
    Timer,
    Truck,
    X,
} from "lucide-react";
import toast from "react-hot-toast";

import { storage } from "@/lib/firebase";
import { displayOrderNumber } from "@/lib/formatters";
import { formatDeliverySlot } from "@/lib/preOrderSlots";
import { flowErrorMessage, sendOrderEvent } from "@/lib/directOrders";
import type { FlowEvent } from "@/functions/src/order-flow";
import type { LegStatus, Order } from "@/lib/types";

/** What this restaurant's share of the order is waiting on, in its own words. */
const LEG_STATE: Record<LegStatus, { label: string; color: string }> = {
    pending: { label: "Confirm items", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    confirmed: {
        label: "Awaiting payment",
        color: "text-gray-300 bg-white/5 border-white/10",
    },
    unavailable: {
        label: "Customer deciding",
        color: "text-red-400 bg-red-500/10 border-red-500/20",
    },
    dropped: { label: "Removed", color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
    paid: { label: "Paid · prepare", color: "text-green-400 bg-green-500/10 border-green-500/20" },
    ready: { label: "Ready", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
};

/** Whether this restaurant has something to do on the order right now. */
export function needsPartnerAction(order: Order, restaurantId: string): boolean {
    const leg = order.legs?.[restaurantId];
    const collects =
        order.paymentCollector?.type === "restaurant" &&
        order.paymentCollector.restaurantId === restaurantId;
    return (
        leg?.status === "pending" ||
        leg?.status === "paid" ||
        (collects && order.status === "payment_submitted")
    );
}

interface DirectOrderCardProps {
    order: Order;
    restaurantId: string;
}

export default function DirectOrderCard({ order, restaurantId }: DirectOrderCardProps) {
    const [busy, setBusy] = useState(false);
    const [picking, setPicking] = useState(false);
    const [missing, setMissing] = useState<string[]>([]);

    const leg = order.legs?.[restaurantId];
    const items = order.items.filter((i) => i.restaurantId === restaurantId);
    const share = items.reduce((s, i) => s + Number(i.unitPrice ?? i.price) * i.quantity, 0);
    const collects =
        order.paymentCollector?.type === "restaurant" &&
        order.paymentCollector.restaurantId === restaurantId;
    const verifying = collects && order.status === "payment_submitted";
    const state = leg ? LEG_STATE[leg.status] : LEG_STATE.dropped;

    const act = async (event: FlowEvent, done: string) => {
        setBusy(true);
        try {
            await sendOrderEvent(order.id, event);
            toast.success(done);
            setPicking(false);
            setMissing([]);
        } catch (error) {
            toast.error(flowErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const openScreenshot = async () => {
        if (!order.payment?.screenshotPath) return;
        // Opened before awaiting so mobile browsers don't treat it as a popup.
        const tab = window.open("", "_blank");
        try {
            const url = await getDownloadURL(ref(storage, order.payment.screenshotPath));
            if (tab) tab.location.href = url;
            else window.location.href = url;
        } catch {
            tab?.close();
            toast.error("Couldn't load the screenshot.");
        }
    };

    const toggle = (id: string) =>
        setMissing((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="bg-white/5 border border-orange-500/20 rounded-2xl overflow-hidden"
        >
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black tracking-widest text-white">
                        {displayOrderNumber(order)}
                    </span>
                    <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                            verifying
                                ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                                : state.color
                        }`}
                    >
                        {verifying ? "Verify payment" : state.label}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border text-orange-300 bg-orange-500/5 border-orange-500/20">
                        In-app
                    </span>
                    {order.deliverySlot && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border text-cyan-400 bg-cyan-500/10 border-cyan-500/20 flex items-center gap-1">
                            <Timer size={10} />
                            {formatDeliverySlot(order.deliverySlot)}
                        </span>
                    )}
                </div>
                <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                    <Clock size={12} />
                    {(order.createdAt as Date | undefined)?.toLocaleTimeString?.([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                </span>
            </div>

            <div className="p-5 space-y-4">
                <div className="space-y-2">
                    {items.map((item, idx) => {
                        const out = leg?.outOfStockItems?.includes(item.id);
                        return (
                            <div key={idx} className="flex items-center gap-3">
                                <span className="font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 w-7 h-7 flex items-center justify-center rounded-lg text-sm shrink-0">
                                    {item.quantity}
                                </span>
                                <span
                                    className={`text-sm font-semibold ${out ? "line-through text-red-400/60" : "text-white"}`}
                                >
                                    {item.name}
                                    {item.variant?.name && (
                                        <span className="text-gray-500">
                                            {" "}
                                            ({item.variant.name})
                                        </span>
                                    )}
                                    {item.addons?.length ? (
                                        <span className="text-gray-500">
                                            {" "}
                                            + {item.addons.map((a) => a.name).join(", ")}
                                        </span>
                                    ) : null}
                                </span>
                            </div>
                        );
                    })}
                    <p className="text-xs text-gray-500">Your share: ₹{share}</p>
                </div>

                {order.instructions && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-black text-yellow-400/70 uppercase tracking-widest mb-1">
                            Special Instructions
                        </p>
                        <p className="text-sm text-yellow-200">{order.instructions}</p>
                    </div>
                )}

                {leg?.status === "pending" && !picking && (
                    <div className="flex flex-col gap-2">
                        <button
                            disabled={busy}
                            onClick={() => act({ type: "confirm" }, "Order confirmed")}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            {busy ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Check size={16} />
                            )}
                            Everything available
                        </button>
                        <button
                            disabled={busy}
                            onClick={() => setPicking(true)}
                            className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <AlertTriangle size={16} /> Some items unavailable
                        </button>
                    </div>
                )}

                {picking && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">
                            Select unavailable items:
                        </p>
                        {items.map((item) => (
                            <label
                                key={item.id}
                                className="flex items-center gap-3 cursor-pointer text-sm text-white"
                            >
                                <input
                                    type="checkbox"
                                    checked={missing.includes(item.id)}
                                    onChange={() => toggle(item.id)}
                                    className="w-4 h-4 accent-red-500"
                                />
                                {item.name} ×{item.quantity}
                            </label>
                        ))}
                        <div className="flex gap-2 pt-2">
                            <button
                                disabled={busy || missing.length === 0}
                                onClick={() =>
                                    act(
                                        { type: "mark_unavailable", itemIds: missing },
                                        "Customer notified"
                                    )
                                }
                                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2"
                            >
                                {busy && <Loader2 size={14} className="animate-spin" />}
                                Tell customer
                            </button>
                            <button
                                onClick={() => {
                                    setPicking(false);
                                    setMissing([]);
                                }}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {verifying && order.payment && (
                    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-white font-black">
                            <IndianRupee size={16} className="text-orange-400" />₹{order.finalTotal}
                            <span className="text-xs text-gray-500 font-medium">to your UPI</span>
                        </div>
                        <p className="text-xs text-gray-400">
                            UTR / transaction ID{" "}
                            <span className="font-mono font-bold text-white">
                                {order.payment.transactionId}
                            </span>
                        </p>
                        <button
                            onClick={openScreenshot}
                            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
                        >
                            <ExternalLink size={12} /> View screenshot
                        </button>
                        <div className="flex gap-2">
                            <button
                                disabled={busy}
                                onClick={() =>
                                    act(
                                        { type: "verify_payment" },
                                        "Payment verified, start preparing"
                                    )
                                }
                                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2"
                            >
                                {busy ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Check size={14} />
                                )}
                                Received
                            </button>
                            <button
                                disabled={busy}
                                onClick={() =>
                                    act({ type: "reject_payment" }, "Customer asked to pay again")
                                }
                                className="flex-1 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-gray-300 font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2 border border-white/10"
                            >
                                <X size={14} /> Not received
                            </button>
                        </div>
                    </div>
                )}

                {leg?.status === "paid" && (
                    <button
                        disabled={busy}
                        onClick={() => act({ type: "mark_ready" }, "Marked as ready")}
                        className="w-full bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-400 hover:text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {busy ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Truck size={16} />
                        )}
                        Ready for Delivery
                    </button>
                )}
            </div>
        </motion.div>
    );
}
