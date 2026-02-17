"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import { useCart } from "../context/CartContext";
import { User, Phone, MapPin, Send, Plus, X, ShoppingBasket, Trash2, Clock, AlertCircle } from "lucide-react";
import TermsFooter from "../components/TermsFooter";
import toast from "react-hot-toast";
// Fallback is defined in context

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import { getISTTime, checkManualOverride } from "@/lib/dateUtils";

export default function GroceryPage() {
    const { grocerySettings, groceryNumber } = useCart();
    const [isLive, setIsLive] = useState(true);
    const [campusConfig, setCampusConfig] = useState(DEFAULT_CAMPUS_CONFIG);

    useEffect(() => {
        const checkLiveStatus = () => {
            // 1. Check Manual Override
            const overrideStatus = checkManualOverride(grocerySettings);
            if (overrideStatus !== null) {
                setIsLive(overrideStatus === 'open');
                return;
            }

            // 2. Fallback to Slot Check
            const { timeInMinutes } = getISTTime();
            const slots = grocerySettings?.slots || [];

            if (slots.length === 0) {
                setIsLive(false);
                return;
            }

            const active = slots.some(slot => {
                const [startH, startM] = (slot.start || "00:00").split(":").map(Number);
                const [endH, endM] = (slot.end || "23:59").split(":").map(Number);
                return timeInMinutes >= (startH * 60 + startM) && timeInMinutes <= (endH * 60 + endM);
            });
            setIsLive(active);
        };

        checkLiveStatus();
        const interval = setInterval(checkLiveStatus, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [grocerySettings]);

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        campus: "",
        hostel: ""
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
                        hostel: parsed.address || parsed.room || parsed.hostel || prev.hostel
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
                address: formData.hostel,
                hostel: formData.hostel
            };
            localStorage.setItem("pumato_user_details", JSON.stringify(toSave));
        }
    }, [formData]);

    const [items, setItems] = useState([
        { id: 1, name: "", quantity: "" }
    ]);

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), name: "", quantity: "" }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, field, value) => {
        if (field === 'quantity' && value !== '' && Number(value) < 1) return;
        const newItems = items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        setItems(newItems);
    };

    // Fetch Campus Config
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "general_settings", "laundry"); // Reusing laundry settings for campus config
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().campuses) {
                    setCampusConfig(docSnap.data().campuses);
                }
            } catch (error) {
                console.error("Error fetching campus config:", error);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmedName = formData.name.trim();
        const trimmedHostel = formData.hostel.trim();
        const validItems = items.filter(i => i.name.trim().length > 0);

        if (!trimmedName || !formData.phone || !formData.campus || !trimmedHostel || validItems.length === 0) {
            toast.error("Please fill in all details including Campus and add at least one item.");
            return;
        }

        if (formData.phone.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number.");
            return;
        }

        let message = `*New Grocery Order* 🛒\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${trimmedName}\n`;
        message += `Phone: ${formData.phone}\n`;
        message += `Campus: ${formData.campus}\n`;

        const selectedCampus = campusConfig.find(c => c.id === formData.campus);
        if (selectedCampus && selectedCampus.deliveryCharge > 0) {
            message += `Delivery Charge: ₹${selectedCampus.deliveryCharge}\n`;
        }

        message += `Hostel: ${trimmedHostel}\n\n`;

        message += `*Grocery List:*\n`;
        validItems.forEach((item, index) => {
            message += `${index + 1}. ${item.name} ${item.quantity ? `(Qty: ${item.quantity})` : ''}\n`;
        });

        const whatsappUrl = `https://wa.me/${groceryNumber}?text=${encodeURIComponent(message)}`;
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

                    {/* Offline Overlay */}
                    {!isLive && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                            <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20 mb-4 animate-pulse">
                                <Clock size={48} className="text-red-500" />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">Service Offline</h2>
                            <p className="text-gray-400 max-w-sm mb-6">Grocery delivery is currently closed. Please check the top navigation bar for operating hours.</p>
                            <div className="flex gap-2 text-xs font-bold uppercase tracking-widest text-red-500 bg-red-500/5 px-4 py-2 rounded-full border border-red-500/10">
                                <AlertCircle size={14} /> Currently Closed
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={`space-y-8 ${!isLive ? 'opacity-20 pointer-events-none' : ''}`}>

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
                                            maxLength={10}
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, phone: val });
                                            }}
                                            className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-green-500/50 focus:bg-black/60 transition-all text-white placeholder-gray-600 font-medium"
                                            placeholder="10-digit phone number"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Campus</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {campusConfig.map((campus) => (
                                            <button
                                                key={campus.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, campus: campus.id })}
                                                className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${formData.campus === campus.id ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/50' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                <span>{campus.name}</span>
                                                {campus.deliveryCharge > 0 && (
                                                    <span className="text-[10px] opacity-70 bg-white/10 px-1.5 rounded-full">+₹{campus.deliveryCharge}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Hostel</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-green-500 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            required
                                            value={formData.hostel}
                                            onChange={(e) => setFormData({ ...formData, hostel: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:border-green-500/50 focus:bg-black/60 transition-all text-white placeholder-gray-600 font-medium"
                                            placeholder="Hostel Name (e.g. SRK)"
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
                                    <div key={item.id} className="flex flex-wrap gap-2 items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="bg-black/40 border border-white/10 rounded-lg flex-1 flex items-center px-3 focus-within:border-green-500/50 focus-within:bg-black/60 transition-all">
                                            <span className="text-gray-500 font-bold mr-2 text-xs">{index + 1}.</span>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                                className="bg-transparent border-none outline-none w-full py-2.5 text-white placeholder-gray-600 font-medium text-sm"
                                                placeholder="Item (e.g. Milk)"
                                            />
                                        </div>
                                        <div className="w-16 bg-black/40 border border-white/10 rounded-lg flex items-center px-2 focus-within:border-green-500/50 focus-within:bg-black/60 transition-all">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                className="bg-transparent border-none outline-none w-full py-2.5 text-white placeholder-gray-600 font-medium text-center text-sm"
                                                placeholder="Qty"
                                            />
                                        </div>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center flex-shrink-0"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors flex items-center gap-1 ml-1"
                            >
                                <Plus size={14} /> Add Another Item
                            </button>
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
        </main >
    );
}
