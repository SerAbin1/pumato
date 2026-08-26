"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SKIP_KEYS = new Set(["heavyItems", "heavyItemCharge"]);

const formatValue = (key, value) => {
    if (value === null || value === undefined) return "(not set)";
    if (key === "deliveryCampusConfig" && Array.isArray(value)) {
        if (value.length === 0) return "(empty)";
        return value
            .map((c) => {
                const slots = (c.slots || [])
                    .filter((s) => s.start && s.end)
                    .map((s) => `${s.start}–${s.end}`)
                    .join(", ");
                return `${c.name}: ₹${c.deliveryCharge}${slots ? ` [${slots}]` : ""}`;
            })
            .join("\n");
    }
    if (key === "lightItems" && Array.isArray(value)) {
        return value.length === 0 ? "(none)" : `${value.length} item(s)`;
    }
    if (key === "whatsappGroups" && Array.isArray(value)) {
        return value.length === 0 ? "(none)" : `${value.length} group(s)`;
    }
    if (key === "manualOverride") {
        if (!value) return "Auto (follows slots)";
        return value.status === "open" ? "Force Open" : "Force Closed";
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string" && value === "") return "(empty)";
    return String(value);
};

const FIELD_LABELS = {
    baseDeliveryCharge: "Base Delivery Charge",
    extraItemThreshold: "Extra Item Threshold",
    extraItemCharge: "Extra Item Charge",
    minOrderAmount: "Min Order Amount",
    lightItems: "Light Items",
    lightItemThreshold: "Light Item Bundle Size",
    heavyItems: "Heavy Items",
    heavyItemCharge: "Heavy Item Charge",
    deliveryCampusConfig: "Campus Delivery Config",
    manualOverride: "Service Override",
    whatsappNumber: "Food Delivery Number",
    laundryWhatsappNumber: "Laundry Number",
    paymentQR: "Payment QR",
    upiId: "UPI ID",
    googleSheetUrl: "Google Sheet URL",
    whatsappGroups: "Community Groups",
};

export default function SaveConfirmationModal({ isOpen, onClose, onConfirm, title, data }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!mounted) return null;

    const entries = Object.entries(data).filter(([k, v]) => !SKIP_KEYS.has(k) && v !== undefined);

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md z-0"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative z-10 w-full max-w-lg bg-[#121214] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] p-8 md:p-10 max-h-[85vh] flex flex-col"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                <AlertCircle size={32} />
                            </div>

                            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
                                Confirm Save
                            </h3>
                            <p className="text-gray-400 font-medium text-sm">
                                This will update <span className="text-orange-400">{title}</span> in
                                Firestore
                            </p>
                            <p className="text-gray-600 text-xs mt-1 font-mono">
                                site_content/order_settings
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 mb-6 -mx-2 px-2">
                            <div className="space-y-1">
                                {entries.map(([key, value]) => (
                                    <div
                                        key={key}
                                        className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2.5 border-b border-white/5 last:border-0"
                                    >
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest sm:w-44 shrink-0 pt-0.5">
                                            {FIELD_LABELS[key] || key}
                                        </span>
                                        <span className="text-sm text-white font-medium whitespace-pre-wrap break-all">
                                            {formatValue(key, value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-4 rounded-xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className="flex-1 px-6 py-4 rounded-xl font-bold text-white transition-all active:scale-95 shadow-lg bg-orange-600 hover:bg-orange-500 shadow-orange-900/40"
                            >
                                Save
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
