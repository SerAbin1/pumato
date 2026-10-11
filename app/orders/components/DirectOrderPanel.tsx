"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ImageUp, IndianRupee, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

import { buildUpiLink, isValidTransactionId, normalizeTransactionId } from "@/lib/upi";
import { flowErrorMessage, sendOrderEvent, uploadPaymentProof } from "@/lib/directOrders";
import { displayOrderNumber } from "@/lib/formatters";
import type { OrderLine } from "@/functions/src/order-flow";
import type { LegStatus, Order, Restaurant } from "@/lib/types";

type DirectOrder = Omit<Order, "createdAt"> & { createdAt: Date | null };

const LEG_LABELS: Record<LegStatus, { label: string; color: string }> = {
    pending: { label: "Waiting to confirm", color: "text-blue-400" },
    confirmed: { label: "Confirmed", color: "text-green-400" },
    unavailable: { label: "Items unavailable", color: "text-red-400" },
    dropped: { label: "Removed", color: "text-gray-500" },
    paid: { label: "Preparing", color: "text-yellow-400" },
    ready: { label: "Ready", color: "text-cyan-400" },
};

interface DirectOrderPanelProps {
    order: DirectOrder;
    restaurants: Restaurant[];
    pumatoUpiId: string;
    pumatoPayeeName: string;
    supportNumber: string;
}

/** Everything a customer does on an in-app order, after placing it. */
export default function DirectOrderPanel({
    order,
    restaurants,
    pumatoUpiId,
    pumatoPayeeName,
    supportNumber,
}: DirectOrderPanelProps) {
    const restaurantName = (id: string) =>
        order.items.find((i) => i.restaurantId === id)?.restaurantName ||
        restaurants.find((r) => r.id === id)?.name ||
        "Restaurant";
    const legs = Object.entries(order.legs || {});
    const unavailable = legs.filter(([, leg]) => leg.status === "unavailable");

    return (
        <div className="space-y-3">
            {legs.length > 1 && (
                <div className="space-y-1">
                    {legs.map(([id, leg]) => (
                        <div key={id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{restaurantName(id)}</span>
                            <span className={`font-bold ${LEG_LABELS[leg.status].color}`}>
                                {LEG_LABELS[leg.status].label}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {order.status === "awaiting_customer" &&
                unavailable.map(([id, leg]) => (
                    <ResolveLeg
                        key={id}
                        order={order}
                        restaurantId={id}
                        restaurantName={restaurantName(id)}
                        missing={leg.outOfStockItems || []}
                        restaurants={restaurants}
                    />
                ))}

            {(order.status === "awaiting_payment" || order.status === "payment_submitted") && (
                <PayOrder
                    order={order}
                    restaurants={restaurants}
                    pumatoUpiId={pumatoUpiId}
                    pumatoPayeeName={pumatoPayeeName}
                />
            )}

            <a
                href={`https://wa.me/${supportNumber}?text=${encodeURIComponent(
                    `Hi, I need help with my order ${displayOrderNumber(order)}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs font-bold text-green-400 hover:text-green-300 transition-colors"
            >
                Need help? Chat with us on WhatsApp
            </a>
        </div>
    );
}

// --- Out-of-stock choices ---

function ResolveLeg({
    order,
    restaurantId,
    restaurantName,
    missing,
    restaurants,
}: {
    order: DirectOrder;
    restaurantId: string;
    restaurantName: string;
    missing: string[];
    restaurants: Restaurant[];
}) {
    const [busy, setBusy] = useState(false);
    const [picking, setPicking] = useState(false);
    const missingNames = order.items
        .filter((i) => i.restaurantId === restaurantId && missing.includes(i.id))
        .map((i) => i.name);

    const resolve = async (
        choice: "remove" | "cancel_restaurant" | "replace",
        replacements?: OrderLine[]
    ) => {
        setBusy(true);
        try {
            await sendOrderEvent(order.id, {
                type: "resolve",
                restaurantId,
                choice,
                ...(replacements ? { replacements } : {}),
            });
            setPicking(false);
        } catch (error) {
            toast.error(flowErrorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">
                    <span className="font-bold">{restaurantName}</span> is out of{" "}
                    {missingNames.join(", ") || "some items"}. What should we do?
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                    disabled={busy}
                    onClick={() => resolve("remove")}
                    className="bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
                >
                    Remove missing items
                </button>
                <button
                    disabled={busy}
                    onClick={() => setPicking(true)}
                    className="bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-bold py-2.5 rounded-lg transition-colors"
                >
                    Replace them
                </button>
                <button
                    disabled={busy}
                    onClick={() => resolve("cancel_restaurant")}
                    className="bg-white/5 hover:bg-white/10 disabled:opacity-40 text-gray-300 text-xs font-bold py-2.5 rounded-lg border border-white/10 transition-colors"
                >
                    Cancel {restaurantName}
                </button>
            </div>
            <p className="text-[10px] text-gray-500">
                Your total is recalculated after any change. Replacements go back to the restaurant
                to confirm.
            </p>
            {picking && (
                <ReplacementPicker
                    restaurants={restaurants}
                    busy={busy}
                    onCancel={() => setPicking(false)}
                    onConfirm={(lines) => resolve("replace", lines)}
                />
            )}
        </div>
    );
}

/** One orderable choice: a plain item, or one variant of an item. */
interface Choice {
    key: string;
    restaurantId: string;
    restaurantName: string;
    itemId: string;
    variantId?: string;
    name: string;
    price: number;
}

function ReplacementPicker({
    restaurants,
    busy,
    onCancel,
    onConfirm,
}: {
    restaurants: Restaurant[];
    busy: boolean;
    onCancel: () => void;
    onConfirm: (lines: OrderLine[]) => void;
}) {
    const [query, setQuery] = useState("");
    const [quantities, setQuantities] = useState<Record<string, number>>({});

    // Only Payment Partners can take part in an in-app order. Add-ons aren't
    // offered here; variants are listed as separate choices.
    const choices = useMemo<Choice[]>(
        () =>
            restaurants
                .filter((r) => r.isPaymentPartner && r.isVisible !== false)
                .flatMap((r) =>
                    (r.menu || [])
                        .filter((item) => item.isVisible)
                        .flatMap((item) =>
                            item.variants?.length
                                ? item.variants.map((v) => ({
                                      key: `${r.id}:${item.id}:${v.id}`,
                                      restaurantId: r.id,
                                      restaurantName: r.name,
                                      itemId: item.id,
                                      variantId: v.id,
                                      name: `${item.name} (${v.name})`,
                                      price: Number(v.price) || 0,
                                  }))
                                : [
                                      {
                                          key: `${r.id}:${item.id}`,
                                          restaurantId: r.id,
                                          restaurantName: r.name,
                                          itemId: item.id,
                                          name: item.name,
                                          price: Number(item.price) || 0,
                                      },
                                  ]
                        )
                ),
        [restaurants]
    );

    const q = query.trim().toLowerCase();
    const shown = (
        q
            ? choices.filter(
                  (c) =>
                      c.name.toLowerCase().includes(q) || c.restaurantName.toLowerCase().includes(q)
              )
            : choices
    ).slice(0, 60);

    const step = (key: string, delta: number) =>
        setQuantities((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));

    const lines: OrderLine[] = choices
        .filter((c) => (quantities[c.key] || 0) > 0)
        .map((c) => ({
            itemId: c.itemId,
            restaurantId: c.restaurantId,
            quantity: quantities[c.key],
            ...(c.variantId ? { variantId: c.variantId } : {}),
        }));

    return (
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-3">
            <div className="flex items-center gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search dishes or restaurants"
                    aria-label="Search replacements"
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
                />
                <button
                    onClick={onCancel}
                    aria-label="Close"
                    className="p-2 text-gray-400 hover:text-white"
                >
                    <X size={16} />
                </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
                {shown.map((c) => (
                    <div key={c.key} className="flex items-center justify-between gap-2 py-1.5">
                        <div className="min-w-0">
                            <p className="text-sm text-gray-200 truncate">{c.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">
                                {c.restaurantName} · ₹{c.price}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {(quantities[c.key] || 0) > 0 && (
                                <>
                                    <button
                                        onClick={() => step(c.key, -1)}
                                        aria-label={`Fewer ${c.name}`}
                                        className="w-7 h-7 rounded-lg bg-white/10 text-white font-bold"
                                    >
                                        −
                                    </button>
                                    <span className="text-sm font-bold text-white w-4 text-center">
                                        {quantities[c.key]}
                                    </span>
                                </>
                            )}
                            <button
                                onClick={() => step(c.key, 1)}
                                aria-label={`Add ${c.name}`}
                                className="w-7 h-7 rounded-lg bg-orange-600 text-white font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>
                ))}
                {shown.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4">Nothing matches.</p>
                )}
            </div>
            <button
                disabled={busy || lines.length === 0}
                onClick={() => onConfirm(lines)}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
            >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Send replacements to restaurant
            </button>
        </div>
    );
}

// --- Paying ---

function PayOrder({
    order,
    restaurants,
    pumatoUpiId,
    pumatoPayeeName,
}: {
    order: DirectOrder;
    restaurants: Restaurant[];
    pumatoUpiId: string;
    pumatoPayeeName: string;
}) {
    const [transactionId, setTransactionId] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const collector = order.paymentCollector;
    const restaurant =
        collector?.type === "restaurant"
            ? restaurants.find((r) => r.id === collector.restaurantId)
            : undefined;
    const vpa = restaurant ? restaurant.upiId : pumatoUpiId;
    const payeeName = restaurant ? restaurant.upiPayeeName || restaurant.name : pumatoPayeeName;
    const link = buildUpiLink({
        vpa,
        payeeName,
        amount: order.finalTotal,
        orderNumber: order.orderNumber,
    });

    if (order.status === "payment_submitted") {
        return (
            <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-green-300">
                        Payment received, verifying it now
                    </p>
                    <p className="text-[11px] text-green-400/70 mt-0.5">
                        Reference {order.payment?.transactionId}
                    </p>
                </div>
            </div>
        );
    }

    const submit = async () => {
        const normalized = normalizeTransactionId(transactionId);
        if (!isValidTransactionId(normalized)) {
            toast.error("That doesn't look like a UPI transaction ID.");
            return;
        }
        if (!file) {
            toast.error("Add a screenshot of the payment.");
            return;
        }
        setSubmitting(true);
        try {
            const screenshotPath = await uploadPaymentProof(order.id, file);
            await sendOrderEvent(order.id, {
                type: "submit_payment",
                transactionId: normalized,
                screenshotPath,
            });
        } catch (error) {
            toast.error(flowErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            {order.payment?.status === "rejected" && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-200">
                    We couldn&apos;t verify your last payment (reference{" "}
                    {order.payment.transactionId}). Please pay again or chat with us below.
                </div>
            )}
            <p className="text-xs text-gray-400">
                Everything is confirmed. Pay{" "}
                <span className="font-bold text-white">{payeeName || "Pumato"}</span> to get your
                order started.
            </p>
            {link ? (
                <a
                    href={link}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl transition-colors"
                >
                    <IndianRupee size={16} />
                    Pay ₹{order.finalTotal}
                </a>
            ) : (
                <p className="text-xs text-red-300">
                    UPI details are missing for this payment. Chat with us below.
                </p>
            )}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <label
                    htmlFor={`utr-${order.id}`}
                    className="block text-xs font-bold text-gray-300"
                >
                    After paying, add the UPI transaction ID and a screenshot.
                </label>
                <input
                    id={`utr-${order.id}`}
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. 412345678901"
                    autoComplete="off"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
                />
                <label className="flex items-center gap-2 cursor-pointer bg-black/40 border border-dashed border-white/20 rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:border-orange-500/50">
                    <ImageUp size={16} className="shrink-0" />
                    <span className="truncate">
                        {file ? file.name : "Choose payment screenshot"}
                    </span>
                    <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                </label>
                <button
                    onClick={submit}
                    disabled={submitting || !transactionId.trim() || !file}
                    className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
                >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    Submit payment
                </button>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                    Find the ID in your UPI app under the payment&apos;s details. It may be called
                    UTR, RRN, or transaction ID.
                </p>
            </div>
        </div>
    );
}
