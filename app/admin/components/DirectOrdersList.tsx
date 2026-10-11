"use client";

import { useState } from "react";
import { getDownloadURL, ref } from "firebase/storage";
import { Ban, Check, ExternalLink, Loader2, Phone, Timer, X } from "lucide-react";
import toast from "react-hot-toast";

import { storage } from "@/lib/firebase";
import { displayOrderNumber } from "@/lib/formatters";
import { formatDeliverySlot } from "@/lib/preOrderSlots";
import { customerStatusLabel } from "@/lib/orderHistory";
import { flowErrorMessage, sendOrderEvent } from "@/lib/directOrders";
import ConfirmModal from "@/app/components/ConfirmModal";
import type { FlowEvent } from "@/functions/src/order-flow";
import type { LegStatus, Order } from "@/lib/types";

const LEG_LABELS: Record<LegStatus, string> = {
    pending: "Waiting to confirm",
    confirmed: "Confirmed",
    unavailable: "Items unavailable",
    dropped: "Removed",
    paid: "Preparing",
    ready: "Ready",
};

const FINISHED = ["picked_up", "delivered", "cancelled"];

/** Orders an admin should look at first: a payment for Pumato to verify. */
const needsAdmin = (o: Order) =>
    o.status === "payment_submitted" && o.paymentCollector?.type === "pumato";

const minutesSince = (value: unknown): number | null => {
    const date =
        value instanceof Date
            ? value
            : ((value as { toDate?: () => Date } | undefined)?.toDate?.() ?? null);
    return date ? Math.floor((Date.now() - date.getTime()) / 60000) : null;
};

export default function DirectOrdersList({ orders }: { orders: Order[] }) {
    const sorted = [...orders].sort((a, b) => Number(needsAdmin(b)) - Number(needsAdmin(a)));
    if (sorted.length === 0) {
        return <p className="text-center text-gray-500 text-sm py-16">No in-app orders today.</p>;
    }
    return (
        <div className="grid gap-6">
            {sorted.map((order) => (
                <DirectOrderAdminCard key={order.id} order={order} />
            ))}
        </div>
    );
}

function DirectOrderAdminCard({ order }: { order: Order }) {
    const [busy, setBusy] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);

    const legs = Object.entries(order.legs || {});
    const collector = order.paymentCollector;
    const collectorName =
        collector?.type === "restaurant"
            ? order.items.find((i) => i.restaurantId === collector.restaurantId)?.restaurantName
            : collector
              ? "Pumato"
              : null;
    const idle = minutesSince(order.updatedAt ?? order.createdAt);

    const act = async (event: FlowEvent, done: string) => {
        setBusy(true);
        try {
            await sendOrderEvent(order.id, event);
            toast.success(done);
        } catch (error) {
            toast.error(flowErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const openScreenshot = async () => {
        if (!order.payment?.screenshotPath) return;
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

    return (
        <div
            className={`bg-white/5 border rounded-2xl overflow-hidden ${needsAdmin(order) ? "border-orange-500/40" : "border-white/10"}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black tracking-widest text-white">
                        {displayOrderNumber(order)}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border text-orange-300 bg-orange-500/10 border-orange-500/20">
                        {customerStatusLabel(order.status)}
                    </span>
                    {order.deliverySlot && (
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border text-cyan-400 bg-cyan-500/10 border-cyan-500/20 flex items-center gap-1">
                            <Timer size={10} />
                            {formatDeliverySlot(order.deliverySlot)}
                        </span>
                    )}
                </div>
                {idle !== null && !FINISHED.includes(order.status) && (
                    <span
                        className={`text-xs ${idle >= 15 ? "text-red-400 font-bold" : "text-gray-500"}`}
                    >
                        Last change {idle} min ago
                    </span>
                )}
            </div>

            <div className="p-5 space-y-4">
                <div className="text-sm text-gray-300">
                    <p className="font-bold text-white">{order.name}</p>
                    <p className="flex items-center gap-1 text-gray-400">
                        <Phone size={12} />
                        <a href={`tel:${order.phone}`} className="hover:text-white">
                            {order.phone}
                        </a>
                        <span className="text-gray-600">
                            · {order.campus}
                            {order.address ? ` · ${order.address}` : ""}
                        </span>
                    </p>
                </div>

                {legs.map(([restaurantId, leg]) => (
                    <div key={restaurantId} className="bg-black/20 rounded-xl p-3">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="font-bold text-white">
                                {order.items.find((i) => i.restaurantId === restaurantId)
                                    ?.restaurantName || restaurantId}
                            </span>
                            <span className="text-gray-400">{LEG_LABELS[leg.status]}</span>
                        </div>
                        {order.items
                            .filter((i) => i.restaurantId === restaurantId)
                            .map((item, idx) => (
                                <p
                                    key={idx}
                                    className={`text-sm ${leg.outOfStockItems?.includes(item.id) ? "line-through text-red-400/60" : "text-gray-300"}`}
                                >
                                    {item.quantity}× {item.name}
                                    {item.variant?.name ? ` (${item.variant.name})` : ""}
                                </p>
                            ))}
                    </div>
                ))}

                <div className="flex items-center justify-between text-sm border-t border-white/5 pt-3">
                    <span className="text-gray-500">
                        {collectorName ? `Paid to ${collectorName}` : "Not yet payable"}
                    </span>
                    <span className="font-black text-white">₹{order.finalTotal}</span>
                </div>

                {order.payment && (
                    <div className="text-xs text-gray-400 space-y-1">
                        <p>
                            Payment {order.payment.status.replace("_", " ")} · UTR{" "}
                            <span className="font-mono text-white">
                                {order.payment.transactionId}
                            </span>
                        </p>
                        <button
                            onClick={openScreenshot}
                            className="font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1"
                        >
                            <ExternalLink size={12} /> View screenshot
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {order.status === "payment_submitted" && (
                        <>
                            <button
                                disabled={busy}
                                onClick={() => act({ type: "verify_payment" }, "Payment verified")}
                                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2"
                            >
                                {busy ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Check size={14} />
                                )}
                                Payment received
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
                        </>
                    )}
                    {!FINISHED.includes(order.status) && (
                        <button
                            disabled={busy}
                            onClick={() => setConfirmCancel(true)}
                            className="bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center gap-2"
                        >
                            <Ban size={14} /> Cancel order
                        </button>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmCancel}
                onClose={() => setConfirmCancel(false)}
                onConfirm={() => {
                    setConfirmCancel(false);
                    act({ type: "cancel" }, "Order cancelled");
                }}
                title="Cancel this order?"
                message={`${displayOrderNumber(order)} will be cancelled for the customer and every restaurant. ${order.payment?.status === "verified" ? "The payment was already verified, so refund the customer separately." : ""}`}
                confirmLabel="Cancel order"
                cancelLabel="Keep it"
                isDanger
            />
        </div>
    );
}
