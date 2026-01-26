"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import { User, Phone, MapPin, Send, Plus, X, ShoppingBasket, Trash2 } from "lucide-react";
import TermsFooter from "../components/TermsFooter";
import { GROCERY_NUMBER } from "@/lib/whatsapp";

export default function GroceryPage() {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        room: ""
    });

    // 1. Load from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("pumato_user_details");
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setFormData(prev => ({
                        ...prev,
                        name: parsed.name || prev.name,
                        phone: parsed.phone || prev.phone,
                        room: parsed.address || parsed.room || prev.room
                    }));
                } catch (e) {
                    console.error("Failed to parse saved user details", e);
                }
            }
        }
    }, []);

    // 2. Save to localStorage whenever formData changes
    useEffect(() => {
        if (typeof window !== "undefined") {
            // Map room back to address for cross-tab sharing with CartDrawer
            const toSave = {
                name: formData.name,
                phone: formData.phone,
                address: formData.room,
                room: formData.room
            };
            localStorage.setItem("pumato_user_details", JSON.stringify(toSave));
        }
    }, [formData]);

    const [items, setItems] = useState([
        { id: 1, text: "" }
    ]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), text: "" }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, value) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, text: value } : item
        );
        setItems(newItems);

        // Auto-add new item if the last one is being typed in
        const lastItem = newItems[newItems.length - 1];
        if (lastItem.id === id && value.length > 0 && items.length < 20) {
            // Optional: Auto-add logic if preferred, but user just said "new text box will appear".
            // Implementation: Let's stick to explicit "+" button or maybe a smarter "Enter" key or check.
            // The user said: "when i add a one grocery then other new text box will apear"
            // Let's interpret this as: When I type in the last box, a new one appears?
            // Or just a simple "Add" button is fine.
            // Let's implement the "Add" button for better UX control, but make it very prominent.
        }
    };

    // Auto-add effect: whenever the last item has text, add a new one?
    // Let's try to match the user's specific request "when i add a one grocery then other new text box will apear".
    // We can check if the last item is not empty, add a new empty one.
    const handleInputChange = (id, value) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, text: value } : item
        );

        // If we are typing in the last item and it's not empty, append a new one
        if (id === items[items.length - 1].id && value.trim().length > 0) {
            setItems([...newItems, { id: Date.now(), text: "" }]);
        } else {
            setItems(newItems);
        }

        // If we clear the second to last item and the last item is empty, maybe remove the last one?
        // Let's keep it simple: Add-on-type logic.
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const validItems = items.filter(i => i.text.trim().length > 0);

        if (!formData.name || !formData.phone || !formData.room || validItems.length === 0) {
            alert("Please fill in all details and add at least one item.");
            return;
        }

        let message = `*New Grocery Order* 🛒\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${formData.name}\n`;
        message += `Phone: ${formData.phone}\n`;
        message += `Room: ${formData.room}\n\n`;

        message += `*grocery List:*\n`;
        validItems.forEach((item, index) => {
            message += `${index + 1}. ${item.text}\n`;
        });

        const whatsappUrl = `https://wa.me/${GROCERY_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    };

    return (
        <main className="min-h-screen bg-black text-white relative selection:bg-green-500 selection:text-white pb-20 overflow-x-hidden">
            {/* Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            {/* Ambient Glow */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-green-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none" />

            <Navbar />

            <div className="max-w-3xl mx-auto px-4 pt-32 relative z-10">

                {/* Header */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center justify-center p-4 bg-white/5 rounded-full mb-6 border border-white/10 shadow-lg shadow-green-900/20"
                    >
                        <ShoppingBasket size={40} className="text-green-400" />
                    </motion.div>
                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-4xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-br from-green-400 to-emerald-600"
                    >
                        Express Grocery
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 text-lg max-w-lg mx-auto"
                    >
                        Need essentials? Add them to your list below and we'll deliver them to your door.
                    </motion.p>
                </div>

                {/* Form Container */}
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden"
                >
                    {/* Glass Shine */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* Personal Details */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="bg-green-500/20 text-green-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm border border-green-500/30">1</span>
                                Your Details
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-green-500 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-green-500/50 focus:bg-black/60 transition-all text-white placeholder-gray-600 font-medium"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Phone Number</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-green-500 transition-colors" size={20} />
                                        <input
                                            type="tel"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-green-500/50 focus:bg-black/60 transition-all text-white placeholder-gray-600 font-medium"
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Delivery Location</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-green-500 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.room}
                                            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-green-500/50 focus:bg-black/60 transition-all text-white placeholder-gray-600 font-medium"
                                            placeholder="Room No, Hostel Block..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-white/5 border-dashed" />

                        {/* Grocery List */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="bg-green-500/20 text-green-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm border border-green-500/30">2</span>
                                Grocery List
                            </h3>

                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={item.id}
                                        className="flex gap-2"
                                    >
                                        <div className="bg-black/40 border border-white/10 rounded-xl flex-1 flex items-center px-4 focus-within:border-green-500/50 focus-within:bg-black/60 transition-all">
                                            <span className="text-gray-500 font-bold mr-3 text-sm">{index + 1}.</span>
                                            <input
                                                type="text"
                                                value={item.text}
                                                onChange={(e) => handleInputChange(item.id, e.target.value)}
                                                className="bg-transparent border-none outline-none w-full py-3 text-white placeholder-gray-600 font-medium"
                                                placeholder={`Item name (e.g. Milk, Bread...)`}
                                            />
                                        </div>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="w-12 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center"
                                                tabIndex="-1"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                            <div className="text-xs text-gray-500 ml-2 font-medium">
                                * Tip: Type in the last box to automatically add a new line.
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-green-900/20 hover:shadow-green-900/40 transition-all flex items-center justify-center gap-3 border border-white/10 mt-6"
                        >
                            <span>Place Order via WhatsApp</span>
                            <Send size={20} />
                        </motion.button>

                    </form>
                </motion.div>
            </div>

            <TermsFooter type="grocery" />
        </main>
    );
}
