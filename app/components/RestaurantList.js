import Link from "next/link";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function RestaurantList({ restaurants }) {
    if (!restaurants || restaurants.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                <p className="text-gray-500 text-lg">No restaurants found matching your filters.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {restaurants.map((restaurant, i) => {
                const isClosed = restaurant.isVisible === false;
                return (
                    <motion.div
                        key={restaurant.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={!isClosed ? { y: -5 } : {}}
                        className={`group ${isClosed ? 'opacity-60 grayscale-[0.5]' : ''}`}
                    >
                        <Link href={`/restaurant?id=${restaurant.id}`} className={isClosed ? 'cursor-pointer' : ''}>
                            <div className={`bg-white/5 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/10 transition-all shadow-lg ${!isClosed ? 'hover:border-orange-500/50 hover:bg-white/10 hover:shadow-orange-900/20' : ''}`}>

                                {/* Image Section */}
                                <div className="relative h-60 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                    <img
                                        src={restaurant.image}
                                        alt={restaurant.name}
                                        className={`w-full h-full object-cover transform transition-transform duration-700 ease-in-out ${!isClosed ? 'group-hover:scale-110' : ''}`}
                                    />
                                    {isClosed && (
                                        <div className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center">
                                            <div className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-sm shadow-2xl scale-110">
                                                Temporarily Closed
                                            </div>
                                        </div>
                                    )}
                                    {restaurant.offer && !isClosed && (
                                        <div className="absolute top-4 left-4 z-20 bg-blue-600/90 backdrop-blur-md text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg">
                                            {restaurant.offer}
                                        </div>
                                    )}
                                    <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-end">
                                        <div className="bg-white text-black px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1 shadow-lg">
                                            <Clock size={12} /> {restaurant.deliveryTime}
                                        </div>
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-6">
                                    <h3 className={`text-xl font-bold transition-colors line-clamp-1 mb-2 ${!isClosed ? 'text-white group-hover:text-orange-400' : 'text-gray-400'}`}>{restaurant.name}</h3>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-1">{restaurant.cuisine}</p>
                                    <div className="border-t border-white/10 pt-4 flex justify-between items-center text-sm font-medium text-gray-300">
                                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider border border-white/10 px-2 py-1 rounded">{restaurant.priceForTwo || "Menu"}</span>
                                        <span className={`transition-transform ${!isClosed ? 'text-orange-500 group-hover:translate-x-1' : 'text-gray-500'}`}>
                                            {isClosed ? 'View Menu' : 'View Menu →'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                );
            })
            }
        </div >
    );
}
