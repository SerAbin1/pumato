"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const categories = [
    { id: 1, name: "Biryani", image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=200&h=200&fit=crop" },
    { id: 2, name: "Pizza", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop" },
    { id: 3, name: "Burger", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=200&fit=crop" },
    { id: 4, name: "Dosa", image: "https://images.unsplash.com/photo-1589301760576-41f473911525?w=200&h=200&fit=crop" },
    { id: 5, name: "Juices", image: "https://images.unsplash.com/photo-1613478223719-2db88194ea6b?w=200&h=200&fit=crop" },
    { id: 6, name: "Chinese", image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=200&h=200&fit=crop" },
];

export default function FoodCollections() {
    return (
        <section className="bg-gray-50 py-10">
            <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Inspiration for your first order</h2>
                <div className="flex gap-8 overflow-x-auto pb-4 scrollbar-hide">
                    {categories.map((item) => (
                        <motion.div
                            key={item.id}
                            whileHover={{ scale: 1.05 }}
                            className="flex flex-col items-center gap-3 min-w-[120px] cursor-pointer group"
                        >
                            <div className="w-32 h-32 rounded-full overflow-hidden shadow-md group-hover:shadow-xl transition-all relative">
                                <Image
                                    src={item.image}
                                    alt={item.name}
                                    width={128}
                                    height={128}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="font-medium text-gray-700 text-lg">{item.name}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
