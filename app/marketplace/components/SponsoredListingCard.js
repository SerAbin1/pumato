"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

function SponsoredBadge() {
    return (
        <span className="text-[10px] font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/30">
            Sponsored
        </span>
    );
}

function ListingImage({ listing, sizes, iconSize }) {
    return listing.images?.[0] ? (
        <Image
            src={listing.images[0]}
            alt={listing.itemName || ""}
            fill
            sizes={sizes}
            className="object-cover"
        />
    ) : (
        <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <Package className="text-white/20" size={iconSize} />
        </div>
    );
}

/**
 * An in-feed promoted marketplace listing rendered in-between regular items.
 * @param {{ listing: object, surface: string, variant?: "menu" | "grid" }} props
 */
export default function SponsoredListingCard({ listing, surface, variant = "menu" }) {
    const params = { listing_id: listing.id, placement: "inFeed", surface };
    const href = `/marketplace?id=${listing.id}`;

    if (variant === "grid") {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                onViewportEnter={() => trackEvent("promo_impression", params)}
                whileHover={{ y: -5 }}
                className="group"
            >
                <Link href={href} onClick={() => trackEvent("promo_click", params)}>
                    <div className="relative bg-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden border border-purple-500/30 transition-all shadow-lg hover:border-purple-500/60 hover:bg-white/10 hover:shadow-purple-900/20">
                        <div className="relative h-60 overflow-hidden">
                            <ListingImage
                                listing={listing}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                iconSize={48}
                            />
                            <div className="absolute top-4 left-4 z-20">
                                <SponsoredBadge />
                            </div>
                        </div>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1 mb-2">
                                {listing.itemName || "Untitled"}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-1">
                                {listing.description}
                            </p>
                            <div className="border-t border-white/10 pt-4 flex justify-between items-center text-sm font-medium text-gray-300">
                                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider border border-white/10 px-2 py-1 rounded">
                                    {listing.askingPrice
                                        ? `₹${listing.askingPrice}`
                                        : "Marketplace"}
                                </span>
                                <span className="text-purple-400 group-hover:translate-x-1 transition-transform">
                                    View →
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            onViewportEnter={() => trackEvent("promo_impression", params)}
        >
            <Link
                href={href}
                onClick={() => trackEvent("promo_click", params)}
                className="bg-purple-500/5 p-4 md:p-6 rounded-[2rem] border border-purple-500/20 flex items-center gap-4 md:gap-8 group transition-all hover:bg-purple-500/10 hover:border-purple-500/40 hover:shadow-2xl"
            >
                <div className="flex-1 min-w-0">
                    <div className="mb-2">
                        <SponsoredBadge />
                    </div>
                    <h4 className="font-bold text-white text-base md:text-lg mb-1 group-hover:text-purple-400 transition-colors">
                        {listing.itemName || "Untitled"}
                    </h4>
                    {listing.askingPrice ? (
                        <p className="font-bold text-gray-300">₹{listing.askingPrice}</p>
                    ) : null}
                    {listing.description && (
                        <p className="text-gray-500 text-sm mt-3 line-clamp-2 leading-relaxed font-medium">
                            {listing.description}
                        </p>
                    )}
                </div>
                <div className="w-28 md:w-32 flex-shrink-0 space-y-2">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
                        <ListingImage listing={listing} sizes="128px" iconSize={32} />
                    </div>
                    <div className="w-full bg-purple-600 text-white py-2 rounded-xl font-black uppercase text-xs text-center tracking-widest group-hover:bg-purple-500 transition-colors">
                        View
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
