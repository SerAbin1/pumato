"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import TermsFooter from "../../components/TermsFooter";
import SellForm from "./components/SellForm";
import { serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, SITE_CONTENT_DOCS, DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import { createMarketplaceRequest } from "@/lib/repositories";
import { formatMarketplaceRequestMessage } from "@/lib/whatsapp";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function MarketplaceSellPage() {
    const [categories, setCategories] = useState([]);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [redirectLinks, setRedirectLinks] = useState([]);

    const [formData, setFormData] = useState(() => {
        const defaultState = {
            itemName: "",
            description: "",
            askingPrice: "",
            campus: "",
            sellerName: "",
            sellerWhatsApp: "",
            customLinks: [],
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

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const snap = await getDoc(
                    doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_CATEGORIES)
                );
                if (snap.exists()) {
                    setCategories(snap.data().categories || []);
                }
            } catch (err) {
                console.error("Error fetching marketplace categories:", err);
            } finally {
                setCategoriesLoading(false);
            }
        };
        const fetchRedirectLinks = async () => {
            try {
                const snap = await getDoc(
                    doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_REDIRECT_LINKS)
                );
                if (snap.exists()) {
                    setRedirectLinks(snap.data().redirectLinks || []);
                }
            } catch (err) {
                console.error("Error fetching marketplace redirect links:", err);
            } finally {
            }
        };
        fetchCategories();
        fetchRedirectLinks();
    }, []);

    const handleSelectCategory = (category) => {
        setSelectedCategory(category);
    };

    const handleBack = () => {
        setSelectedCategory(null);
    };

    const activeLink = redirectLinks.find((l) => l.active);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleAddLink = () => {
        setFormData((prev) => ({
            ...prev,
            customLinks: [...(prev.customLinks || []), { type: "", link: "" }],
        }));
    };

    const handleRemoveLink = (index) => {
        setFormData((prev) => ({
            ...prev,
            customLinks: prev.customLinks.filter((_, i) => i !== index),
        }));
    };

    const handleLinkChange = (index, field, value) => {
        setFormData((prev) => ({
            ...prev,
            customLinks: prev.customLinks.map((link, i) =>
                i === index ? { ...link, [field]: value } : link
            ),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedItemName = formData.itemName.trim();
        const trimmedDescription = formData.description.trim();
        const trimmedSellerName = formData.sellerName.trim();

        const requiredFields = selectedCategory?.fields || [
            "itemName",
            "description",
            "askingPrice",
            "campus",
        ];
        const missingFields = [];
        if (requiredFields.includes("itemName") && !trimmedItemName) {
            missingFields.push("Item Name");
        }
        if (requiredFields.includes("description") && !trimmedDescription) {
            missingFields.push("Description");
        }
        if (requiredFields.includes("askingPrice") && !formData.askingPrice) {
            missingFields.push("Asking Price");
        }
        if (requiredFields.includes("campus") && !formData.campus) {
            missingFields.push("Campus");
        }
        if (missingFields.length > 0) {
            toast.error(`Please fill in: ${missingFields.join(", ")}`);
            return;
        }

        if (!trimmedSellerName || formData.sellerWhatsApp.length !== 10) {
            toast.error("Please enter your name and a valid 10-digit WhatsApp number.");
            return;
        }

        const customLinks = (formData.customLinks || []).filter((l) => l.type && l.link.trim());

        const request = {
            itemName: trimmedItemName,
            description: trimmedDescription,
            askingPrice: Number(formData.askingPrice),
            campus: formData.campus,
            sellerName: trimmedSellerName,
            sellerWhatsApp: formData.sellerWhatsApp,
            customLinks,
        };

        try {
            await createMarketplaceRequest({
                ...request,
                status: "pending",
                createdAt: serverTimestamp(),
            });
        } catch (err) {
            console.error("Failed to save marketplace request", err);
            toast.error("Failed to save your request. Please try again.");
            return;
        }

        const activeLink = redirectLinks.find((l) => l.active);
        if (activeLink && activeLink.url) {
            const url = new URL(activeLink.url);
            url.searchParams.set(
                "text",
                decodeURIComponent(formatMarketplaceRequestMessage(request))
            );
            window.location.href = url.toString();
        } else {
            toast.error("No redirect link configured. Please contact support.");
            return;
        }
        toast.success("Request submitted! Redirecting...");
    };

    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden">
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
            <Navbar />
            <div className="max-w-2xl mx-auto px-4 py-12 pt-24">
                {selectedCategory ? (
                    <>
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                        >
                            <ArrowLeft size={18} /> Back
                        </button>
                        <SellForm
                            formData={formData}
                            handleChange={handleChange}
                            setFormData={setFormData}
                            campusConfig={DEFAULT_CAMPUS_CONFIG}
                            handleSubmit={handleSubmit}
                            formTitle={selectedCategory.actionLabel}
                            categoryFields={selectedCategory.fields || []}
                            categoryOptionalFields={selectedCategory.optionalFields || []}
                            customLinks={formData.customLinks || []}
                            redirectLabel={activeLink?.label}
                            onAddLink={handleAddLink}
                            onRemoveLink={handleRemoveLink}
                            onLinkChange={handleLinkChange}
                        />
                    </>
                ) : (
                    <>
                        <h1 className="text-3xl font-black text-white mb-2">Post on Marketplace</h1>
                        <p className="text-gray-400 mb-8">What would you like to post?</p>

                        {categoriesLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 size={32} className="animate-spin text-purple-500" />
                            </div>
                        ) : categories.length === 0 ? (
                            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                                <p className="text-gray-500">
                                    No posting categories available yet.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {categories.map((cat, index) => (
                                    <button
                                        key={`${cat.label}-${index}`}
                                        onClick={() => handleSelectCategory(cat)}
                                        className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 hover:border-purple-500/50 transition-all group"
                                    >
                                        <h3 className="font-bold text-white text-lg mb-1 group-hover:text-purple-400 transition-colors">
                                            {cat.label}
                                        </h3>
                                        <p className="text-gray-400 text-sm">{cat.actionLabel}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
            <TermsFooter type="marketplace" />
        </main>
    );
}
