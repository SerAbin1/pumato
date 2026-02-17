"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import LaundryHero from "./components/LaundryHero";
import LaundryForm from "./components/LaundryForm";
import { LAUNDRY_NUMBER } from "@/lib/whatsapp"; // Fallback
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

export default function LaundryPage() {
    const newItemRef = useRef(null);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        campus: "",
        location: "",
        date: "",
        time: "",
        instructions: ""
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
                        location: parsed.address || parsed.room || parsed.location || prev.location
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
            // Only save if name, phone or location has value to avoid overwriting with empty
            if (formData.name || formData.phone || formData.location) {
                // Map location back to address for cross-tab sharing with CartDrawer/Grocery
                const currentSaved = JSON.parse(localStorage.getItem("pumato_user_details") || "{}");
                const toSave = {
                    ...currentSaved,
                    name: formData.name || currentSaved.name,
                    phone: formData.phone || currentSaved.phone,
                    address: formData.location || currentSaved.address,
                    location: formData.location || currentSaved.location
                };
                localStorage.setItem("pumato_user_details", JSON.stringify(toSave));
            }
        }
    }, [formData.name, formData.phone, formData.location]);

    const [items, setItems] = useState([
        { id: Date.now(), name: "", quantity: "", steamIron: false }
    ]);
    const [estimatedWeight, setEstimatedWeight] = useState(5);

    // Load items from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedItems = localStorage.getItem("pumato_laundry_items");
            if (savedItems) {
                try {
                    setItems(JSON.parse(savedItems));
                } catch (e) {
                    console.error("Failed to parse saved laundry items", e);
                }
            }
        }
    }, []);

    // Save items to localStorage whenever they change
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("pumato_laundry_items", JSON.stringify(items));
        }
    }, [items]);

    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [laundryNumber, setLaundryNumber] = useState(LAUNDRY_NUMBER);
    const [campusConfig, setCampusConfig] = useState(DEFAULT_CAMPUS_CONFIG);

    // Laundry Pricing State
    const [pricing, setPricing] = useState({ pricePerKg: "79", steamIronPrice: "15" });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // 1. WhatsApp Number
                const settingsDoc = await getDoc(doc(db, "site_content", "order_settings"));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    if (data.laundryWhatsappNumber) {
                        setLaundryNumber(data.laundryWhatsappNumber);
                    }
                }

                // 2. Campus Config & Pricing
                const laundrySettingsDoc = await getDoc(doc(db, "general_settings", "laundry"));
                if (laundrySettingsDoc.exists()) {
                    const data = laundrySettingsDoc.data();
                    if (data.campuses) setCampusConfig(data.campuses);
                    if (data.pricing) setPricing(data.pricing);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
            }
        };
        fetchSettings();
    }, []);

    // Fetch slots when date changes
    useEffect(() => {
        const fetchSlots = async () => {
            if (!formData.date) return;

            setLoadingSlots(true);
            setAvailableSlots([]);
            setFormData(prev => ({ ...prev, time: "" })); // Reset time on date change

            try {
                // 1. Get Day of Week (Safe parsing for YYYY-MM-DD)
                // Appending T00:00:00 matches Date's ISO parsing which is UTC,
                // but we want to ensure we get the weekday for that specific date string universally.
                // Using new Date(dateString) is parsed as UTC for hyphens.
                const date = new Date(formData.date);
                const dayName = date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });

                // 2. Try Specific Day Override
                const dayRef = doc(db, "laundry_slots", dayName);
                const daySnap = await getDoc(dayRef);

                if (daySnap.exists() && daySnap.data().slots && daySnap.data().slots.length > 0) {
                    // If specific day has slots (even empty array is a valid "no slots" override, but here we check length to infer "set")
                    // Actually, if document exists, it is an override. If slots are empty, it means "Closed" or "No slots".
                    setAvailableSlots(daySnap.data().slots || []);
                } else if (daySnap.exists()) {
                    // Document exists but slots empty/undefined -> Treat as "No slots available" (Closed)
                    setAvailableSlots([]);
                } else {
                    // 3. Fallback to Global Default
                    const defaultRef = doc(db, "laundry_slots", "default");
                    const defaultSnap = await getDoc(defaultRef);

                    if (defaultSnap.exists()) {
                        setAvailableSlots(defaultSnap.data().slots || []);
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
        setItems([...items, { id: Date.now(), name: "", quantity: "", steamIron: false }]);
        setTimeout(() => newItemRef.current?.focus(), 0);
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

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const trimmedName = formData.name.trim();
        const trimmedLocation = formData.location.trim();
        const validItems = items.filter(i => i.name.trim().length > 0);

        if (!trimmedName || !formData.phone || !formData.campus || !trimmedLocation || !formData.date || !formData.time) {
            toast.error("Please fill in all details including Campus, Hostel & Pickup Date/Time.");
            return;
        }

        if (formData.phone.length !== 10) {
            toast.error("Please enter a valid 10-digit phone number.");
            return;
        }

        let message = `*New Laundry Pickup Request* 🧺\n\n`;
        message += `*Customer Details:*\n`;
        message += `Name: ${trimmedName}\n`;
        message += `Phone: ${formData.phone}\n`;
        message += `Campus: ${formData.campus}\n`;

        const selectedCampus = campusConfig.find(c => c.id === formData.campus);
        if (selectedCampus && selectedCampus.deliveryCharge > 0) {
            message += `Delivery Charge: ₹${selectedCampus.deliveryCharge}\n`;
        }

        message += `Hostel: ${trimmedLocation}\n`;
        if (formData.instructions) {
            message += `Instructions: ${formData.instructions}\n`;
        }
        message += `\n`;

        message += `*Pickup Schedule:*\n`;
        message += `Date: ${formData.date}\n`;
        message += `Time: ${formData.time}\n\n`;

        if (validItems.length > 0) {
            message += `*Clothing Items:*\n`;
            validItems.forEach((item, index) => {
                message += `${index + 1}. ${item.name} ${item.quantity ? `(Qty: ${item.quantity})` : ''} ${item.steamIron ? '(Steam Iron)' : ''}\n`;
            });
        }

        const whatsappUrl = `https://wa.me/${laundryNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");

        // Clear only the laundry items, keeping user details
        localStorage.removeItem("pumato_laundry_items");
        setItems([{ id: Date.now(), name: "", quantity: "", steamIron: false }]);
    };

    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
            <Navbar />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 py-12 pt-32 relative z-10">

                <div className="grid md:grid-cols-2 gap-12 items-start">

                    {/* Left Column */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-6 min-w-0"
                    >
                        <LaundryHero pricing={pricing} />
                    </motion.div>

                    {/* Right Column: Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="min-w-0"
                    >
                        <LaundryForm
                            formData={formData}
                            handleChange={handleChange}
                            setFormData={setFormData}
                            campusConfig={campusConfig}
                            availableSlots={availableSlots}
                            loadingSlots={loadingSlots}
                            today={today}
                            items={items}
                            handleAddItem={handleAddItem}
                            handleRemoveItem={handleRemoveItem}
                            handleItemChange={handleItemChange}
                            handleSubmit={handleSubmit}
                            newItemRef={newItemRef}
                            estimatedWeight={estimatedWeight}
                            setEstimatedWeight={setEstimatedWeight}
                            pricing={pricing}
                        />
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
