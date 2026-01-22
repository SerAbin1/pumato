"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { ArrowLeft, Clock, Shirt, MapPin, Phone, User, Send, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LAUNDRY_NUMBER } from "@/lib/whatsapp";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function LaundryPage() {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        location: "",
        date: "",
        time: ""
    });

    const [items, setItems] = useState([
        { id: 1, name: "", quantity: "" }
    ]);

    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Fetch slots when date changes
    useEffect(() => {
        const fetchSlots = async () => {
            if (!formData.date) return;

            setLoadingSlots(true);
            setAvailableSlots([]);
            setFormData(prev => ({ ...prev, time: "" })); // Reset time on date change

            try {
                // 1. Try Specific Date
                const dateRef = doc(db, "laundry_slots", formData.date);
                const dateSnap = await getDoc(dateRef);

                if (dateSnap.exists()) {
                    setAvailableSlots(dateSnap.data().slots || []);
                } else {
                    // 2. Try Global Default
                    const defaultRef = doc(db, "laundry_slots", "default");
                    const defaultSnap = await getDoc(defaultRef);

                    if (defaultSnap.exists()) {
                        setAvailableSlots(defaultSnap.data().slots || []);
                    } else {
                        // 3. Fallback Hardcoded
                        setAvailableSlots([
                            "10:00 AM - 11:00 AM",
                            "11:00 AM - 12:00 PM",
                            "04:00 PM - 05:00 PM",
                            "05:00 PM - 06:00 PM"
                        ]);
                    }
                }
            } catch (error) {
                console.error("Error fetching slots:", error);
            }
            setLoadingSlots(false);
        };

        fetchSlots();
    }, [formData.date]);

    // Get today's date for min attribute
    const today = new Date().toISOString().split("T")[0];

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), name: "", quantity: "" }]);
    };

    const handleRemoveItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, field, value) => {
        const newItems = items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        );
        setItems(newItems);
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Filter out empty items
        const validItems = items.filter(i => i.name.trim().length > 0);

        if (!formData.name || !formData.phone || !formData.location || !formData.date || !formData.time) {
            alert("Please fill in all details including Pickup Date & Time.");
            return;
        }

        let message = `*New Laundry Pickup Request* 🧺\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${formData.name}\n`;
        message += `Phone: ${formData.phone}\n`;
        message += `Location: ${formData.location}\n\n`;

        message += `*Pickup Schedule:*\n`;
        message += `Date: ${formData.date}\n`;
        message += `Time: ${formData.time}\n\n`;

        if (validItems.length > 0) {
            message += `*Clothing Items:*\n`;
            validItems.forEach((item, index) => {
                message += `${index + 1}. ${item.name} ${item.quantity ? `(Qty: ${item.quantity})` : ''}\n`;
            });
        }

        const whatsappUrl = `https://wa.me/${LAUNDRY_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    };

    return (
        <main className="min-h-screen bg-black text-white relative overflow-hidden">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            <Navbar />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-5xl mx-auto px-4 py-24 relative z-10">
                <Link href="/" className="inline-flex items-center text-gray-400 hover:text-white font-medium mb-8 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Back to Home
                </Link>

                <div className="grid md:grid-cols-2 gap-12 items-start">

                    {/* Left Column */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-6"
                    >
                        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 border border-white/10 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>

                            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Laundry Service</h1>
                            <p className="text-gray-400 mb-8 text-lg font-light leading-relaxed">
                                Professional care for your clothes. Schedule a pickup from your hostel and get fresh, ironed clothes within 24 hours.
                            </p>

                            <ul className="space-y-6">
                                {[
                                    { icon: Clock, text: "24h Turnaround Time" },
                                    { icon: Shirt, text: "Wash, Steam Iron & Fold" },
                                    { icon: MapPin, text: "Doorstep Pickup & Drop" }
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                            <item.icon size={18} />
                                        </div>
                                        <span className="font-medium text-gray-200">{item.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>

                    {/* Right Column: Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 md:p-10 border border-white/10 relative shadow-2xl"
                    >
                        <h2 className="text-2xl font-bold mb-8 text-white">Request Pickup</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {[
                                { label: "Your Name", name: "name", type: "text", placeholder: "John Doe", icon: User },
                                { label: "Phone Number", name: "phone", type: "tel", placeholder: "917...", icon: Phone },
                                { label: "Pickup Location", name: "location", type: "text", placeholder: "Hostel Block A, Room 101", icon: MapPin }
                            ].map((field, i) => (
                                <div key={i}>
                                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">{field.label}</label>
                                    <div className="relative group">
                                        <field.icon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                                        <input
                                            type={field.type}
                                            name={field.name}
                                            required
                                            placeholder={field.placeholder}
                                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-black/40 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium text-white placeholder-gray-600"
                                            value={formData[field.name]}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Date & Time Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Pickup Date</label>
                                <div className="relative group">
                                    <input
                                        type="date"
                                        name="date"
                                        required
                                        min={today}
                                        className="w-full px-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-black/40 text-white [color-scheme:dark] font-bold"
                                        value={formData.date}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Pickup Time {formData.date && !loadingSlots ? <span className="text-blue-400 text-xs font-normal ml-2">({availableSlots.length} slots available)</span> : ""}</label>
                                {!formData.date ? (
                                    <div className="p-4 rounded-xl border border-dashed border-white/10 text-gray-500 text-sm text-center">
                                        Please select a date first
                                    </div>
                                ) : loadingSlots ? (
                                    <div className="p-4 rounded-xl border border-dashed border-white/10 text-gray-500 text-sm text-center animate-pulse">
                                        Loading slots...
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {availableSlots.map((slot, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, time: slot })}
                                                className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${formData.time === slot ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                        {availableSlots.length === 0 && (
                                            <div className="col-span-2 text-center text-red-400 text-sm py-2">No slots available for this date.</div>
                                        )}
                                    </div>
                                )}
                            </div>


                            <hr className="border-white/5 border-dashed my-6" />

                            {/* Dynamic Laundry List */}
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-400 ml-1">Clothing Items (Optional)</label>
                                <div className="space-y-3">
                                    {items.map((item, index) => (
                                        <div key={item.id} className="flex gap-2">
                                            <div className="bg-black/20 border border-white/10 rounded-xl flex-1 flex items-center px-4 focus-within:border-blue-500/50 focus-within:bg-black/40 transition-all">
                                                <span className="text-gray-500 font-bold mr-3 text-xs">{index + 1}.</span>
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                                    className="bg-transparent border-none outline-none w-full py-3 text-white placeholder-gray-600 font-medium text-sm"
                                                    placeholder="Item (e.g. Shirt)"
                                                />
                                            </div>
                                            <div className="w-20 bg-black/20 border border-white/10 rounded-xl flex items-center px-2 focus-within:border-blue-500/50 focus-within:bg-black/40 transition-all">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                    className="bg-transparent border-none outline-none w-full py-3 text-white placeholder-gray-600 font-medium text-center text-sm"
                                                    placeholder="Qty"
                                                />
                                            </div>
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="w-10 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center flex-shrink-0"
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
                                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 ml-1"
                                >
                                    <Plus size={14} /> Add Another Item
                                </button>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group mt-2"
                            >
                                <Send size={20} className="group-hover:translate-x-1 transition-transform" />
                                <span>Schedule Pickup via WhatsApp</span>
                            </motion.button>

                            <p className="text-xs text-center text-gray-500 mt-4">
                                You will be redirected to WhatsApp to complete your booking.
                            </p>
                        </form>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
