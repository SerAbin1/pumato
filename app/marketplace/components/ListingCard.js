"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Package, MessageCircle } from "lucide-react";
import { formatMarketplaceOfferMessage } from "@/lib/whatsapp";

export default function ListingCard({ listing, index = 0 }) {
    const [willingPrice, setWillingPrice] = useState(listing.askingPrice);

    const handleBuy = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const message = formatMarketplaceOfferMessage(listing, willingPrice);
        window.open(`https://wa.me/${listing.sellerWhatsApp}?text=${message}`, "_blank");
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5 }}
            className="group"
        >
            <div className="relative bg-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/10 transition-all shadow-lg hover:border-purple-500/50 hover:bg-white/10 hover:shadow-purple-900/20">
                <Link href={`/marketplace?id=${listing.id}`}>
                    <div className="relative h-56 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                        {listing.images?.[0] ? (
                            <Image
                                src={listing.images[0]}
                                alt={listing.itemName}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover transform transition-transform duration-700 ease-in-out group-hover:scale-110"
                                priority={index < 4}
                            />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <Package className="text-white/20" size={48} />
                            </div>
                        )}
                        <div className="absolute top-4 left-4 z-20 bg-purple-600/90 backdrop-blur-md text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg">
                            {listing.category}
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
                            <div className="bg-white text-black px-2 py-0.5 rounded-md text-xs font-bold shadow-lg">
                                {listing.campus}
                            </div>
                        </div>
                    </div>
                    <div className="p-6 pb-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1 mb-2">
                            {listing.itemName}
                        </h3>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                            {listing.description}
                        </p>
                        <p className="text-2xl font-black text-white">
                            ₹{listing.askingPrice}
                            <span className="text-xs font-medium text-gray-500 ml-2 uppercase tracking-wider">
                                Asking Price
                            </span>
                        </p>
                    </div>
                </Link>

                <div className="px-6 pb-6 border-t border-white/10 pt-4 space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                            Your Offer (₹)
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={willingPrice}
                            onChange={(e) => setWillingPrice(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-bold"
                        />
                    </div>
                    <button
                        onClick={handleBuy}
                        className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/30"
                    >
                        <MessageCircle size={18} /> Buy on WhatsApp
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
