"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";

import {
    buildUpiLink,
    isValidTransactionId,
    normalizeTransactionId,
    paymentReference,
} from "@/lib/upi";
import { createPayment } from "@/lib/repositories";
import { serverTimestamp } from "firebase/firestore";

/**
 * Pay-by-UPI for one order.
 *
 * Paying is an app switch with no way back, so the flow is: invoke the deep
 * link, then watch for the tab regaining focus and ask for the reference at
 * exactly that moment. The prompt is armed only once *this* order's link has
 * actually been invoked — otherwise every incidental tab focus would pop a
 * payment form at people who never started paying.
 */
export default function UpiPaymentPanel({ order, user, upiId, upiPayeeName, existingPayment }) {
    const [payment, setPayment] = useState(existingPayment || null);
    const [awaitingPayment, setAwaitingPayment] = useState(false);
    const [transactionId, setTransactionId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);

    const link = buildUpiLink({
        vpa: upiId,
        payeeName: upiPayeeName,
        amount: Number(order.finalTotal),
        orderNumber: order.orderNumber,
    });

    useEffect(() => {
        if (!awaitingPayment) return;

        const onVisible = () => {
            if (document.visibilityState !== "visible") return;
            // Focus after paint, or the input isn't mounted yet to receive it.
            requestAnimationFrame(() => inputRef.current?.focus());
        };

        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [awaitingPayment]);

    if (!link) return null;

    if (payment) {
        return (
            <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-green-300">
                        We&apos;ve received it, confirming shortly
                    </p>
                    <p className="text-[11px] text-green-400/70 mt-0.5">
                        Reference {payment.transactionId}
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

        setSubmitting(true);
        try {
            const record = {
                orderId: order.id,
                userId: user.uid,
                orderNumber: order.orderNumber,
                amount: Number(order.finalTotal),
                reference: paymentReference(order.orderNumber),
                transactionId: normalized,
                status: "pending_verification",
                createdAt: serverTimestamp(),
            };
            await createPayment(record);
            setPayment(record);
            setAwaitingPayment(false);
        } catch (error) {
            console.error("Failed to record payment:", error);
            // A create-only rule means a second submission lands here rather
            // than overwriting the first.
            toast.error(
                error?.code === "permission-denied"
                    ? "A payment is already recorded for this order."
                    : "Couldn't record that. Try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <a
                href={link}
                onClick={() => setAwaitingPayment(true)}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl transition-colors"
            >
                <IndianRupee size={16} />
                Pay ₹{order.finalTotal}
            </a>

            {awaitingPayment && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <label
                        htmlFor={`utr-${order.id}`}
                        className="block text-xs font-bold text-gray-300"
                    >
                        Paste your UPI transaction ID below.
                    </label>
                    <input
                        id={`utr-${order.id}`}
                        ref={inputRef}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="e.g. 412345678901"
                        inputMode="text"
                        autoComplete="off"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={submit}
                            disabled={submitting || !transactionId.trim()}
                            className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" /> Submitting
                                </>
                            ) : (
                                "Submit"
                            )}
                        </button>
                        <button
                            onClick={() => setAwaitingPayment(false)}
                            className="px-4 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                        >
                            Later
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                        Find it in your UPI app under the payment&apos;s details — it may be called
                        UTR, RRN, or transaction ID.
                    </p>
                </div>
            )}
        </div>
    );
}
