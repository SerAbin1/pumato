"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import TermsFooter from "../../components/TermsFooter";
import SellForm from "./components/SellForm";
import { serverTimestamp } from "firebase/firestore";
import { createMarketplaceRequest } from "@/lib/repositories";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import { LAUNDRY_NUMBER, formatMarketplaceRequestMessage } from "@/lib/whatsapp";

export default function MarketplaceSellPage() {
    const [formData, setFormData] = useState(() => {
        const defaultState = {
            itemName: "",
            description: "",
            askingPrice: "",
            category: "",
            campus: "",
            sellerName: "",
            sellerWhatsApp: "",
        };

        if (typeof window === "undefined") return defaultState;

        const saved = localStorage.getItem("pumato_user_details");
        if (!saved) return defaultState;

        try {
            const parsed = JSON.parse(saved);
            return {
                ...defaultState,
                sellerName: parsed.name || "",
                sellerWhatsApp: parsed.phone || "",
            };
        } catch (e) {
            console.error("Failed to parse saved user details", e);
            return defaultState;
        }
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedItemName = formData.itemName.trim();
        const trimmedDescription = formData.description.trim();
        const trimmedSellerName = formData.sellerName.trim();

        if (
            !trimmedItemName ||
            !trimmedDescription ||
            !formData.askingPrice ||
            !formData.category ||
            !formData.campus
        ) {
            toast.error("Please fill in all item details including category & campus.");
            return;
        }

        if (!trimmedSellerName || formData.sellerWhatsApp.length !== 10) {
            toast.error("Please enter your name and a valid 10-digit WhatsApp number.");
            return;
        }

        const request = {
            itemName: trimmedItemName,
            description: trimmedDescription,
            askingPrice: Number(formData.askingPrice),
            category: formData.category,
            campus: formData.campus,
            sellerName: trimmedSellerName,
            sellerWhatsApp: formData.sellerWhatsApp,
        };

        const whatsappUrl = `https://wa.me/${LAUNDRY_NUMBER}?text=${formatMarketplaceRequestMessage(request)}`;
        window.open(whatsappUrl, "_blank");

        try {
            await createMarketplaceRequest({
                ...request,
                status: "pending",
                createdAt: serverTimestamp(),
            });
            toast.success("Request submitted! Complete the details on WhatsApp.");
        } catch (err) {
            console.error("Failed to save marketplace request", err);
            toast.error("Something went wrong saving your request, but WhatsApp was opened.");
        }
    };

    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden">
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 py-12">
                <SellForm
                    formData={formData}
                    handleChange={handleChange}
                    setFormData={setFormData}
                    campusConfig={DEFAULT_CAMPUS_CONFIG}
                    handleSubmit={handleSubmit}
                />
            </div>
            <TermsFooter type="marketplace" />
        </main>
    );
}
