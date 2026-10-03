"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package } from "lucide-react";
import usePromotedListings from "@/app/hooks/usePromotedListings";
import { useCart } from "@/app/context/CartContext";
import { isInCooldown, normalizePromotion } from "@/lib/marketplacePromotions";
import { trackEvent } from "@/lib/analytics";

const DISMISSALS_KEY = "pumato_promo_dismissals";
// At most one popup per browser session, however many popup listings are live
const SESSION_SHOWN_KEY = "pumato_promo_shown";
const SHOW_DELAY_MS = 1500;
const EXCLUDED_PATH_PREFIXES = ["/admin", "/partner", "/delivery-partner", "/login"];

function readDismissals() {
    try {
        return JSON.parse(localStorage.getItem(DISMISSALS_KEY) || "{}");
    } catch {
        return {};
    }
}

function recordDismissal(listingId) {
    try {
        const dismissals = readDismissals();
        dismissals[listingId] = Date.now();
        localStorage.setItem(DISMISSALS_KEY, JSON.stringify(dismissals));
    } catch {
        // Storage blocked: the session guard still stops it reappearing right away
    }
}

function alreadyShownThisSession() {
    try {
        return sessionStorage.getItem(SESSION_SHOWN_KEY) === "1";
    } catch {
        return false;
    }
}

function markShownThisSession() {
    try {
        sessionStorage.setItem(SESSION_SHOWN_KEY, "1");
    } catch {
        // ignore
    }
}

/** Shows one eligible popup-promoted marketplace listing as a dismissible popup. */
export default function PromoPopup() {
    const pathname = usePathname();
    const { userDetails } = useCart();
    const promos = usePromotedListings("popup");
    const [listing, setListing] = useState(null);

    const excluded = EXCLUDED_PATH_PREFIXES.some((p) => pathname?.startsWith(p));
    // Wait for a campus so we never stack on top of the campus selector
    const ready = !excluded && Boolean(userDetails?.campus) && promos.length > 0;

    useEffect(() => {
        if (!ready || listing || alreadyShownThisSession()) return;
        const dismissals = readDismissals();
        const candidates = promos.filter(
            (p) =>
                !isInCooldown(dismissals[p.id], normalizePromotion(p.promotion).popup.cooldownHours)
        );
        if (candidates.length === 0) return;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const timer = setTimeout(() => {
            markShownThisSession();
            setListing(pick);
            trackEvent("promo_impression", { listing_id: pick.id, placement: "popup" });
        }, SHOW_DELAY_MS);
        return () => clearTimeout(timer);
    }, [ready, promos, listing]);

    const close = (event) => {
        recordDismissal(listing.id);
        trackEvent(event, { listing_id: listing.id, placement: "popup" });
        setListing(null);
    };

    useEffect(() => {
        if (!listing) return;
        const onKey = (e) => {
            if (e.key === "Escape") close("promo_dismiss");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listing]);

    return (
        <AnimatePresence>
            {listing && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => close("promo_dismiss")}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="promo-popup-title"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
                    >
                        <div className="relative h-56 bg-white/5">
                            {listing.images?.[0] ? (
                                <Image
                                    src={listing.images[0]}
                                    alt={listing.itemName || ""}
                                    fill
                                    sizes="448px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Package className="text-white/20" size={48} />
                                </div>
                            )}
                            <span className="absolute top-4 left-4 text-[10px] font-bold text-white bg-purple-600/90 px-2 py-1 rounded-lg uppercase tracking-wider">
                                Sponsored
                            </span>
                            <button
                                onClick={() => close("promo_dismiss")}
                                aria-label="Close"
                                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full border border-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-3">
                            <h2 id="promo-popup-title" className="text-2xl font-black text-white">
                                {listing.itemName || "Untitled"}
                            </h2>
                            {listing.askingPrice ? (
                                <p className="text-xl font-black text-white">
                                    ₹{listing.askingPrice}
                                </p>
                            ) : null}
                            {listing.description && (
                                <p className="text-gray-400 text-sm line-clamp-3">
                                    {listing.description}
                                </p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => close("promo_dismiss")}
                                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-bold hover:bg-white/10 transition-colors"
                                >
                                    Not now
                                </button>
                                <Link
                                    href={`/marketplace?id=${listing.id}`}
                                    onClick={() => close("promo_click")}
                                    className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-center transition-colors"
                                >
                                    View
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
