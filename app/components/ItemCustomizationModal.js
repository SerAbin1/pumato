"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, Check } from "lucide-react";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";

const toNumber = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

const buildCartKey = (itemId, variantId, addonIds) =>
    `${itemId}::${variantId || "none"}::${(addonIds || []).slice().sort().join(",")}`;

export default function ItemCustomizationModal({
    item,
    restaurantId,
    restaurantName,
    open,
    onClose,
    onAdd,
}) {
    const hasVariants = Array.isArray(item?.variants) && item.variants.length > 0;
    const hasAddons = Array.isArray(item?.addons) && item.addons.length > 0;

    const [selectedVariantId, setSelectedVariantId] = useState(null);
    const [selectedAddonIds, setSelectedAddonIds] = useState([]);
    const [quantity, setQuantity] = useState(1);

    const selectedVariant = useMemo(
        () => item?.variants?.find((v) => v.id === selectedVariantId) || null,
        [item, selectedVariantId]
    );

    const unitPrice = useMemo(() => {
        if (!item) return 0;
        const base =
            hasVariants && selectedVariant ? toNumber(selectedVariant.price) : toNumber(item.price);
        const addonsTotal = (item.addons || [])
            .filter((a) => selectedAddonIds.includes(a.id))
            .reduce((s, a) => s + toNumber(a.price), 0);
        return base + addonsTotal;
    }, [item, hasVariants, selectedVariant, selectedAddonIds]);

    if (!item) return null;

    const toggleAddon = (id) => {
        setSelectedAddonIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleAdd = () => {
        const cartKey = buildCartKey(item.id, selectedVariantId, selectedAddonIds);
        onAdd(
            {
                ...item,
                variant: selectedVariant
                    ? {
                          id: selectedVariant.id,
                          name: selectedVariant.name,
                          price: toNumber(selectedVariant.price),
                      }
                    : undefined,
                addons: (item.addons || [])
                    .filter((a) => selectedAddonIds.includes(a.id))
                    .map((a) => ({ id: a.id, name: a.name, price: toNumber(a.price) })),
                unitPrice,
                cartKey,
                restaurantId,
                restaurantName,
            },
            quantity
        );
        toast.success(`${item.name} added to cart`);
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="w-full sm:max-w-md bg-[#0f0f0f] border border-white/10 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto"
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: "spring", damping: 28, stiffness: 280 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-[#0f0f0f]/95 backdrop-blur border-b border-white/10 p-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-white text-lg leading-tight">
                                    {item.name}
                                </h3>
                                {item.description && (
                                    <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors p-1 shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-6">
                            {hasVariants && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                        Choose Size / Quantity
                                    </p>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => setSelectedVariantId(null)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                                                selectedVariantId === null
                                                    ? "border-orange-500 bg-orange-500/10 text-white"
                                                    : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                                            }`}
                                        >
                                            <span className="font-semibold">{item.name}</span>
                                            <span className="flex items-center gap-2">
                                                <span className="font-bold">₹{item.price}</span>
                                                {selectedVariantId === null && (
                                                    <Check size={16} className="text-orange-400" />
                                                )}
                                            </span>
                                        </button>
                                        {item.variants.map((v) => {
                                            const active = v.id === selectedVariantId;
                                            return (
                                                <button
                                                    key={v.id}
                                                    onClick={() => setSelectedVariantId(v.id)}
                                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                                                        active
                                                            ? "border-orange-500 bg-orange-500/10 text-white"
                                                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                                                    }`}
                                                >
                                                    <span className="font-semibold">{v.name}</span>
                                                    <span className="flex items-center gap-2">
                                                        <span className="font-bold">
                                                            ₹{v.price}
                                                        </span>
                                                        {active && (
                                                            <Check
                                                                size={16}
                                                                className="text-orange-400"
                                                            />
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {hasAddons && (
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                                        Add-ons (optional)
                                    </p>
                                    <div className="space-y-2">
                                        {item.addons.map((a) => {
                                            const active = selectedAddonIds.includes(a.id);
                                            return (
                                                <button
                                                    key={a.id}
                                                    onClick={() => toggleAddon(a.id)}
                                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                                                        active
                                                            ? "border-orange-500 bg-orange-500/10 text-white"
                                                            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                                                    }`}
                                                >
                                                    <span className="font-semibold">{a.name}</span>
                                                    <span className="flex items-center gap-2">
                                                        <span className="font-bold">
                                                            +₹{a.price}
                                                        </span>
                                                        <span
                                                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                                                                active
                                                                    ? "bg-orange-500 border-orange-500"
                                                                    : "border-white/30"
                                                            }`}
                                                        >
                                                            {active && (
                                                                <Check
                                                                    size={14}
                                                                    className="text-black"
                                                                />
                                                            )}
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 bg-[#0f0f0f]/95 backdrop-blur border-t border-white/10 p-4 flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-black/30 rounded-lg p-1 border border-white/10">
                                <button
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="font-bold text-sm w-5 text-center text-white">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-green-500/20 hover:text-green-400 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <button
                                onClick={handleAdd}
                                className="flex-1 bg-white text-black py-3 rounded-xl font-black uppercase text-sm hover:bg-gray-200 transition-colors tracking-widest"
                            >
                                Add · ₹{unitPrice * quantity}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
