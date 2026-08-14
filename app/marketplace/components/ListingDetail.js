"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Package, MessageCircle, Link as LinkIcon } from "lucide-react";
import { formatMarketplaceOfferMessage } from "@/lib/whatsapp";
import { CUSTOM_LINK_TYPES } from "@/lib/customLinks";

export default function ListingDetail({ listing }) {
    const [willingPrice, setWillingPrice] = useState(listing.askingPrice);
    const [activeImage, setActiveImage] = useState(0);

    const whatsappLink = (listing.customLinks || []).find((l) => l.type === "whatsapp")?.link;
    const hasWhatsApp = Boolean(listing.sellerWhatsApp || whatsappLink);
    const isBuyable = Boolean(listing.askingPrice && hasWhatsApp);

    const handleBuy = () => {
        const message = formatMarketplaceOfferMessage(listing, willingPrice);
        if (listing.sellerWhatsApp) {
            window.open(`https://wa.me/${listing.sellerWhatsApp}?text=${message}`, "_blank");
        } else if (whatsappLink) {
            const separator = whatsappLink.includes("?") ? "&" : "?";
            window.open(`${whatsappLink}${separator}text=${message}`, "_blank");
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pt-24">
            <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors text-sm font-bold backdrop-blur-md bg-white/10 px-4 py-2 rounded-full border border-white/10 hover:bg-white/20"
            >
                <ArrowLeft size={16} /> Back to Marketplace
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="relative h-80 md:h-96 rounded-[2rem] overflow-hidden border border-white/10 bg-white/5">
                        {listing.images?.length ? (
                            <Image
                                src={listing.images[activeImage]}
                                alt={listing.itemName}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                                priority
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Package className="text-white/20" size={64} />
                            </div>
                        )}
                    </div>
                    {listing.images?.length > 1 && (
                        <div className="flex gap-3 mt-4">
                            {listing.images.map((img, i) => (
                                <button
                                    key={img}
                                    onClick={() => setActiveImage(i)}
                                    className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImage ? "border-purple-500" : "border-white/10 opacity-60 hover:opacity-100"}`}
                                >
                                    <Image
                                        src={img}
                                        alt=""
                                        fill
                                        sizes="64px"
                                        className="object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="bg-purple-600/90 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg">
                            {listing.filter}
                        </span>
                        {listing.campus && (
                            <span className="bg-white/10 text-gray-300 px-3 py-1 text-xs font-bold rounded-lg">
                                {listing.campus}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                        {listing.itemName || "Untitled"}
                    </h1>
                    {listing.askingPrice ? (
                        <p className="text-3xl font-black text-white mb-6">
                            ₹{listing.askingPrice}
                        </p>
                    ) : null}
                    {listing.description && (
                        <p className="text-gray-400 leading-relaxed whitespace-pre-line mb-8">
                            {listing.description}
                        </p>
                    )}

                    {isBuyable && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Your Offer (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={willingPrice}
                                    onChange={(e) => setWillingPrice(e.target.value)}
                                    className="mt-1 w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-bold text-lg"
                                />
                            </div>
                            <button
                                onClick={handleBuy}
                                className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/30 text-lg"
                            >
                                <MessageCircle size={20} /> Buy on WhatsApp
                            </button>
                        </div>
                    )}

                    {listing.customLinks?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                For more info
                            </span>
                            {listing.customLinks.map((link, i) => {
                                const typeDef = CUSTOM_LINK_TYPES.find((t) => t.id === link.type);
                                const Icon = typeDef?.icon || LinkIcon;
                                return (
                                    <a
                                        key={i}
                                        href={link.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={typeDef?.label || link.label || link.link}
                                        className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl transition-colors border border-white/10 hover:border-purple-500/50 flex flex-col items-center gap-1 min-w-16"
                                    >
                                        <Icon size={20} />
                                        <span className="text-[10px] font-bold">
                                            {typeDef?.label || link.label || "Link"}
                                        </span>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
