import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Trash, Save, Eye, EyeOff, Plus, Star, Flame, Loader2 } from "lucide-react";
import { saveRestaurant, updateRestaurant, deleteRestaurant } from "@/lib/repositories";
import { refreshTrending } from "@/lib/functions";
import { TRENDING_CACHE_KEY } from "@/lib/trending";
import RestaurantForm from "./RestaurantForm";
import ConfirmModal from "../../components/ConfirmModal";
import type { Restaurant } from "@/lib/types";
import type { RestaurantDraft } from "../types";

export default function RestaurantsTab({
    restaurants,
    fetchData,
}: {
    restaurants: Restaurant[];
    fetchData: () => Promise<void>;
}) {
    const [activeTab, setActiveTab] = useState<"list" | "form">("list");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState<Partial<RestaurantDraft> | null>(
        null
    );
    const [isRefreshingTrending, setIsRefreshingTrending] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        restaurantId: string | null;
        restaurantName: string;
    }>({
        isOpen: false,
        restaurantId: null,
        restaurantName: "",
    });

    // --- HANDLERS ---
    const handleAddNew = () => {
        setEditingId(null);
        setSelectedRestaurant({
            name: "",
            image: "",
            cuisine: "",
            deliveryTime: "30 mins",
            offer: "",
            priceForTwo: "",
            baseDeliveryCharge: "30",
            extraItemThreshold: "3",
            extraItemCharge: "10",
            minOrderAmount: "0",
            isVisible: true,
            categories: [],
            menu: [],
        });
        setActiveTab("form");
    };

    const handleEdit = (restaurant: Restaurant) => {
        setEditingId(restaurant.id);
        setSelectedRestaurant({
            ...restaurant,
            categories: restaurant.categories || [],
            outOfStockCategories: restaurant.outOfStockCategories || [],
            isVisible: restaurant.isVisible !== false,
            isAvailable: restaurant.isAvailable !== false,
            isFeatured: restaurant.isFeatured === true,
        });
        setActiveTab("form");
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteRestaurant(id);
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete restaurant");
        }
    };

    // Trending is also recomputed every Sunday; this re-runs it now, e.g. after
    // changing which restaurants are featured.
    const handleRefreshTrending = async () => {
        setIsRefreshingTrending(true);
        try {
            const { data } = await refreshTrending<{ count: number }>();
            // Customers pick the new ranking up when their day-long cache
            // expires; drop this browser's copy so the admin sees it now.
            try {
                localStorage.removeItem(TRENDING_CACHE_KEY);
            } catch {
                // Storage unavailable — nothing cached to clear.
            }
            toast.success(`Trending refreshed: ${data.count} items from last week`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to refresh trending items");
        } finally {
            setIsRefreshingTrending(false);
        }
    };

    const handleSaveRestaurant = async (data: RestaurantDraft) => {
        const id = editingId || Date.now().toString();
        // data is already formatted by RestaurantForm, but we might want to ensure ID is set.
        const formattedData = {
            ...data,
            id,
        };

        try {
            // The form edits loose drafts; RestaurantSchema validates the result.
            await saveRestaurant(id, formattedData as Parameters<typeof saveRestaurant>[1]);
            await fetchData();
            setActiveTab("list");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save restaurant");
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {activeTab === "list" && (
                <div className="flex flex-wrap justify-end gap-4 mb-8">
                    <button
                        onClick={handleRefreshTrending}
                        disabled={isRefreshingTrending}
                        className="bg-white/5 border border-white/10 text-white px-6 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isRefreshingTrending ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Flame size={20} className="text-orange-500" />
                        )}
                        Refresh Trending
                    </button>
                    <button
                        onClick={handleAddNew}
                        className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-orange-900/40 hover:bg-orange-500 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} /> Add New Restaurant
                    </button>
                </div>
            )}

            {activeTab === "list" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...restaurants]
                        .sort(
                            (a, b) =>
                                (a.isVisible === false ? 0 : 1) - (b.isVisible === false ? 0 : 1)
                        )
                        .map((r) => {
                            const hiddenCategories = Array.isArray(r.outOfStockCategories)
                                ? [...new Set(r.outOfStockCategories.filter(Boolean))]
                                : [];

                            return (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={r.id}
                                    className={`bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all group hover:border-white/20 hover:shadow-2xl hover:shadow-orange-900/10 ${r.isVisible === false ? "opacity-60" : ""}`}
                                >
                                    <div className="relative h-56 mb-6 overflow-hidden rounded-2xl bg-black">
                                        {r.image && (
                                            <Image
                                                src={r.image}
                                                alt={r.name}
                                                fill
                                                sizes="(max-width: 768px) 100vw, 400px"
                                                className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                            />
                                        )}
                                        {r.isFeatured === true && r.isVisible !== false && (
                                            <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-md text-black px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1">
                                                <Star size={12} /> Featured
                                            </div>
                                        )}
                                        {r.isVisible === false && (
                                            <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1">
                                                <EyeOff size={12} /> Hidden
                                            </div>
                                        )}
                                        {hiddenCategories.length > 0 && (
                                            <div className="absolute bottom-3 left-3 right-16 flex flex-wrap gap-2 z-10">
                                                {hiddenCategories.map((cat) => (
                                                    <span
                                                        key={`${r.id}-${cat}`}
                                                        className="bg-red-600/90 backdrop-blur-md text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md shadow"
                                                        title="Hidden category"
                                                    >
                                                        {cat}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await updateRestaurant(r.id, {
                                                            isVisible: r.isVisible === false,
                                                        });
                                                        await fetchData();
                                                    } catch (error) {
                                                        console.error(error);
                                                        toast.error("Failed to toggle visibility");
                                                    }
                                                }}
                                                className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-purple-600 hover:text-white text-white transition-all"
                                                title={
                                                    r.isVisible === false
                                                        ? "Show Restaurant"
                                                        : "Hide Restaurant"
                                                }
                                            >
                                                {r.isVisible === false ? (
                                                    <Eye size={18} />
                                                ) : (
                                                    <EyeOff size={18} />
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(r);
                                                }}
                                                className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-blue-600 hover:text-white text-white transition-all"
                                            >
                                                <Save size={18} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        restaurantId: r.id,
                                                        restaurantName: r.name,
                                                    });
                                                }}
                                                className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-red-600 hover:text-white text-white transition-all"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-2xl text-white mb-1">{r.name}</h3>
                                    <p className="text-gray-400 text-sm mb-6">{r.cuisine}</p>
                                    <button
                                        onClick={() => handleEdit(r)}
                                        className="w-full py-4 rounded-xl border border-white/10 text-gray-300 font-bold hover:bg-white hover:text-black transition-all"
                                    >
                                        Edit Details
                                    </button>
                                </motion.div>
                            );
                        })}
                </div>
            ) : (
                <RestaurantForm
                    initialData={selectedRestaurant}
                    onSave={handleSaveRestaurant}
                    onCancel={() => setActiveTab("list")}
                />
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => handleDelete(confirmModal.restaurantId!)}
                title="Delete Restaurant?"
                message={`Are you sure you want to delete "${confirmModal.restaurantName}"? This will permanently remove it from the database.`}
                confirmLabel="Delete Restaurant"
            />
        </div>
    );
}
