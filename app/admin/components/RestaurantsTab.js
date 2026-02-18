import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Trash, Save, Eye, EyeOff, Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import RestaurantForm from "./RestaurantForm";
import ConfirmModal from "../../components/ConfirmModal";

export default function RestaurantsTab({ restaurants, fetchData }) {
    const [activeTab, setActiveTab] = useState("list");
    const [editingId, setEditingId] = useState(null);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, restaurantId: null, restaurantName: "" });

    // --- HANDLERS ---
    const handleAddNew = () => {
        setEditingId(null);
        setSelectedRestaurant({
            name: "", image: "", cuisine: "", deliveryTime: "30 mins", offer: "", priceForTwo: "",
            baseDeliveryCharge: "30", extraItemThreshold: "3", extraItemCharge: "10", minOrderAmount: "0",
            isVisible: true,
            categories: [],
            menu: []
        });
        setActiveTab("form");
    };

    const handleEdit = (restaurant) => {
        setEditingId(restaurant.id);
        setSelectedRestaurant({
            ...restaurant,
            categories: restaurant.categories || [],
            outOfStockCategories: restaurant.outOfStockCategories || [],
            isVisible: restaurant.isVisible !== false,
            isAvailable: restaurant.isAvailable !== false
        });
        setActiveTab("form");
    };

    const handleDelete = async (id) => {
        try {
            await deleteDoc(doc(db, "restaurants", id));
            await fetchData();
        } catch (error) {
            console.error(error);
            alert("Failed to delete");
        }
    };

    const handleSaveRestaurant = async (data) => {
        const id = editingId || Date.now().toString();
        // data is already formatted by RestaurantForm, but we might want to ensure ID is set.
        const formattedData = {
            ...data,
            id
        };

        try {
            await setDoc(doc(db, "restaurants", id), formattedData);
            await fetchData();
            setActiveTab("list");
        } catch (error) {
            console.error(error);
            alert("Failed to save");
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {activeTab === "list" && (
                <div className="flex justify-end mb-8">
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
                        .sort((a, b) => (a.isVisible === false ? 0 : 1) - (b.isVisible === false ? 0 : 1))
                        .map(r => (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                key={r.id}
                                className={`bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all group hover:border-white/20 hover:shadow-2xl hover:shadow-orange-900/10 ${r.isVisible === false ? 'opacity-60' : ''}`}
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
                                    {r.isVisible === false && (
                                        <div className="absolute top-3 left-3 bg-red-500/90 backdrop-blur-md text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg flex items-center gap-1">
                                            <EyeOff size={12} /> Hidden
                                        </div>
                                    )}
                                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const updated = { ...r, isVisible: r.isVisible === false ? true : false };
                                                try {
                                                    await setDoc(doc(db, "restaurants", r.id), updated);
                                                    await fetchData();
                                                } catch (error) {
                                                    console.error(error);
                                                    alert("Failed to toggle visibility");
                                                }
                                            }}
                                            className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-purple-600 hover:text-white text-white transition-all"
                                            title={r.isVisible === false ? "Show Restaurant" : "Hide Restaurant"}
                                        >
                                            {r.isVisible === false ? <Eye size={18} /> : <EyeOff size={18} />}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }} className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-blue-600 hover:text-white text-white transition-all"><Save size={18} /></button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmModal({ isOpen: true, restaurantId: r.id, restaurantName: r.name });
                                            }}
                                            className="bg-white/10 backdrop-blur-md p-2.5 rounded-full hover:bg-red-600 hover:text-white text-white transition-all"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-2xl text-white mb-1">{r.name}</h3>
                                <p className="text-gray-400 text-sm mb-6">{r.cuisine}</p>
                                <button onClick={() => handleEdit(r)} className="w-full py-4 rounded-xl border border-white/10 text-gray-300 font-bold hover:bg-white hover:text-black transition-all">Edit Details</button>
                            </motion.div>
                        ))}
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
                onConfirm={() => handleDelete(confirmModal.restaurantId)}
                title="Delete Restaurant?"
                message={`Are you sure you want to delete "${confirmModal.restaurantName}"? This will permanently remove it from the database.`}
                confirmLabel="Delete Restaurant"
            />
        </div>
    );
}
