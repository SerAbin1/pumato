import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { COLLECTIONS, SITE_CONTENT_DOCS } from "@/lib/constants";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import {
    saveListing,
    updateListing,
    deleteListing,
    updateMarketplaceRequest,
    saveMarketplaceCategories,
    saveMarketplaceRedirectLinks,
} from "@/lib/repositories";
import toast from "react-hot-toast";
import { Trash, Eye, EyeOff, Plus, MessageCircle, Check, Clock, Radio } from "lucide-react";
import MarketplaceListingForm from "./MarketplaceListingForm";
import ConfirmModal from "../../components/ConfirmModal";

export default function MarketplaceTab() {
    const [subSection, setSubSection] = useState("requests"); // requests, listings, categories, settings
    const [requests, setRequests] = useState([]);
    const [listings, setListings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [redirectLinks, setRedirectLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listingView, setListingView] = useState("list"); // list, form
    const [editingId, setEditingId] = useState(null);
    const [selectedListing, setSelectedListing] = useState(null);
    const [sourceRequestId, setSourceRequestId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: null,
        id: null,
        name: "",
    });

    // Redirect link form state
    const [linkLabel, setLinkLabel] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const [isSavingLinks, setIsSavingLinks] = useState(false);

    // Category form state
    const [catLabel, setCatLabel] = useState("");
    const [catActionLabel, setCatActionLabel] = useState("");
    const [catFields, setCatFields] = useState([
        "itemName",
        "description",
        "askingPrice",
        "campus",
    ]);
    const [catOptionalFields, setCatOptionalFields] = useState(["description", "customLinks"]);
    const [isSavingCategories, setIsSavingCategories] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [requestsSnap, listingsSnap, categoriesSnap, redirectLinksSnap] =
                await Promise.all([
                    getDocs(collection(db, COLLECTIONS.MARKETPLACE_REQUESTS)),
                    getDocs(collection(db, COLLECTIONS.MARKETPLACE_LISTINGS)),
                    getDoc(
                        doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_CATEGORIES)
                    ),
                    getDoc(
                        doc(
                            db,
                            COLLECTIONS.SITE_CONTENT,
                            SITE_CONTENT_DOCS.MARKETPLACE_REDIRECT_LINKS
                        )
                    ),
                ]);
            setRequests(requestsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setListings(listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            if (categoriesSnap.exists()) {
                setCategories(categoriesSnap.data().categories || []);
            }
            if (redirectLinksSnap.exists()) {
                setRedirectLinks(redirectLinksSnap.data().redirectLinks || []);
            }
        } catch (error) {
            console.error("Failed to fetch marketplace data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    const pendingRequests = requests
        .filter((r) => r.status !== "handled")
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    const handleCreateFromRequest = (request) => {
        setEditingId(null);
        setSourceRequestId(request.id);
        setSelectedListing({
            itemName: request.itemName,
            description: request.description,
            askingPrice: request.askingPrice,
            category: request.category,
            campus: request.campus,
            sellerName: request.sellerName,
            sellerWhatsApp: request.sellerWhatsApp,
            customLinks: request.customLinks || [],
            images: [],
            isVisible: true,
            expiryDate: "",
        });
        setSubSection("listings");
        setListingView("form");
    };

    const handleDismissRequest = async (id) => {
        try {
            await updateMarketplaceRequest(id, { status: "handled" });
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to dismiss request");
        }
    };

    const handleAddNewListing = () => {
        setEditingId(null);
        setSourceRequestId(null);
        setSelectedListing(null);
        setListingView("form");
    };

    const handleEditListing = (listing) => {
        setEditingId(listing.id);
        setSourceRequestId(null);
        setSelectedListing(listing);
        setListingView("form");
    };

    const handleSaveListing = async (data) => {
        setIsSaving(true);
        const id = editingId || Date.now().toString();
        try {
            await saveListing(id, data);
            if (sourceRequestId) {
                await updateMarketplaceRequest(sourceRequestId, { status: "handled" });
            }
            await fetchData();
            setListingView("list");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save listing");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleVisibility = async (listing) => {
        try {
            await updateListing(listing.id, {
                isVisible: listing.isVisible === false,
            });
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to toggle visibility");
        }
    };

    const handleDeleteListing = async (id) => {
        try {
            await deleteListing(id);
            await fetchData();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete listing");
        }
    };

    const handleAddCategory = async () => {
        const label = catLabel.trim().toUpperCase();
        const actionLabel = catActionLabel.trim();
        const fields = catFields;
        const optionalFields = catOptionalFields;
        if (!label || !actionLabel) {
            toast.error("Please enter both label and action label.");
            return;
        }
        setIsSavingCategories(true);
        try {
            const updated = [...categories, { label, actionLabel, fields, optionalFields }];
            await saveMarketplaceCategories({ categories: updated });
            setCategories(updated);
            setCatLabel("");
            setCatActionLabel("");
            setCatFields(["itemName", "description", "askingPrice", "campus"]);
            setCatOptionalFields([]);
            toast.success("Category added.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save category.");
        } finally {
            setIsSavingCategories(false);
        }
    };

    const handleDeleteCategory = async (index) => {
        setIsSavingCategories(true);
        try {
            const updated = categories.filter((_, i) => i !== index);
            await saveMarketplaceCategories({ categories: updated });
            setCategories(updated);
            toast.success("Category deleted.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete category.");
        } finally {
            setIsSavingCategories(false);
        }
    };

    const handleAddRedirectLink = () => {
        const label = linkLabel.trim();
        const url = linkUrl.trim();
        if (!label || !url) {
            toast.error("Please enter both label and URL.");
            return;
        }
        if (!/^https?:\/\//i.test(url)) {
            toast.error("URL must start with http:// or https://");
            return;
        }
        setRedirectLinks((prev) => [...prev, { label, url, active: prev.length === 0 }]);
        setLinkLabel("");
        setLinkUrl("");
        toast.success("Link added. Save to apply changes.");
    };

    const handleDeleteRedirectLink = (index) => {
        setRedirectLinks((prev) => prev.filter((_, i) => i !== index));
        toast.success("Link removed. Save to apply changes.");
    };

    const handleSetActiveLink = (index) => {
        setRedirectLinks((prev) => prev.map((link, i) => ({ ...link, active: i === index })));
    };

    const handleSaveRedirectLinks = async () => {
        setIsSavingLinks(true);
        try {
            await saveMarketplaceRedirectLinks({ redirectLinks });
            toast.success("Redirect links saved.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save redirect links.");
        } finally {
            setIsSavingLinks(false);
        }
    };

    const isExpired = (listing) => {
        if (!listing.expiryDate) return false;
        return listing.expiryDate < new Date().toISOString().slice(0, 10);
    };

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
                <button
                    onClick={() => setSubSection("requests")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${subSection === "requests" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                >
                    Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </button>
                <button
                    onClick={() => setSubSection("listings")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${subSection === "listings" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                >
                    Listings
                </button>
                <button
                    onClick={() => setSubSection("categories")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${subSection === "categories" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                >
                    Categories
                </button>
                <button
                    onClick={() => setSubSection("settings")}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${subSection === "settings" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-white"}`}
                >
                    Settings
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500">Loading...</p>
            ) : subSection === "requests" ? (
                <div className="space-y-4">
                    {pendingRequests.length === 0 && (
                        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                            <p className="text-gray-500">No pending requests.</p>
                        </div>
                    )}
                    {pendingRequests.map((request) => (
                        <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-4"
                        >
                            <div>
                                <h3 className="font-bold text-white text-lg">{request.itemName}</h3>
                                <p className="text-gray-400 text-sm mb-2">{request.description}</p>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                    <span>₹{request.askingPrice}</span>
                                    <span>{request.category}</span>
                                    <span>{request.campus}</span>
                                    <span>
                                        {request.sellerName} · {request.sellerWhatsApp}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <a
                                    href={`https://wa.me/${request.sellerWhatsApp}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="bg-green-600/20 text-green-400 p-3 rounded-xl hover:bg-green-600/30 transition-colors flex items-center justify-center"
                                    title="Chat on WhatsApp"
                                >
                                    <MessageCircle size={18} />
                                </a>
                                <button
                                    onClick={() => handleCreateFromRequest(request)}
                                    className="bg-purple-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-purple-500 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <Check size={16} /> Create Listing
                                </button>
                                <button
                                    onClick={() => handleDismissRequest(request.id)}
                                    className="bg-white/10 text-gray-300 p-3 rounded-xl hover:bg-white/20 transition-colors"
                                    title="Dismiss"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : subSection === "categories" ? (
                <div className="space-y-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Add Category</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Label
                                </label>
                                <input
                                    type="text"
                                    value={catLabel}
                                    onChange={(e) => setCatLabel(e.target.value)}
                                    placeholder="e.g. Job"
                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Action Label
                                </label>
                                <input
                                    type="text"
                                    value={catActionLabel}
                                    onChange={(e) => setCatActionLabel(e.target.value)}
                                    placeholder="e.g. Post a Job"
                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-3 mb-4">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-white mb-2">
                                    Required Fields
                                </label>
                                <div className="grid grid-cols-2 gap-1">
                                    <label
                                        key="itemName"
                                        className="flex items-center gap-2 cursor-pointer select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={catFields.includes("itemName")}
                                            onChange={(e) =>
                                                setCatFields((prev) =>
                                                    e.target.checked
                                                        ? [...prev, "itemName"]
                                                        : prev.filter((f) => f !== "itemName")
                                                )
                                            }
                                            className="w-4 h-5 accent-purple-500 rounded"
                                        />
                                        <span className="text-sm text-white">Item Name</span>
                                    </label>
                                    <label
                                        key="askingPrice"
                                        className="flex items-center gap-2 cursor-pointer select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={catFields.includes("askingPrice")}
                                            onChange={(e) =>
                                                setCatFields((prev) =>
                                                    e.target.checked
                                                        ? [...prev, "askingPrice"]
                                                        : prev.filter((f) => f !== "askingPrice")
                                                )
                                            }
                                            className="w-4 h-5 accent-purple-500 rounded"
                                        />
                                        <span className="text-sm text-white">Asking Price</span>
                                    </label>
                                    <label
                                        key="campus"
                                        className="flex items-center gap-2 cursor-pointer select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={catFields.includes("campus")}
                                            onChange={(e) =>
                                                setCatFields((prev) =>
                                                    e.target.checked
                                                        ? [...prev, "campus"]
                                                        : prev.filter((f) => f !== "campus")
                                                )
                                            }
                                            className="w-4 h-5 accent-purple-500 rounded"
                                        />
                                        <span className="text-sm text-white">Campus</span>
                                    </label>
                                    <label
                                        key="customLinks"
                                        className="flex items-center gap-2 cursor-pointer select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={catFields.includes("customLinks")}
                                            onChange={(e) =>
                                                setCatFields((prev) =>
                                                    e.target.checked
                                                        ? [...prev, "customLinks"]
                                                        : prev.filter((f) => f !== "customLinks")
                                                )
                                            }
                                            className="w-4 h-5 accent-purple-500 rounded"
                                        />
                                        <span className="text-sm text-white">Custom Links</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider text-white mb-2">
                                    Optional Fields
                                </label>
                                <div className="grid grid-cols-2 gap-1">
                                    <label
                                        key="description"
                                        className="flex items-center gap-2 cursor-pointer select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={catOptionalFields.includes("description")}
                                            onChange={(e) =>
                                                setCatOptionalFields((prev) =>
                                                    e.target.checked
                                                        ? [...prev, "description"]
                                                        : prev.filter((f) => f !== "description")
                                                )
                                            }
                                            className="w-4 h-5 accent-purple-500 rounded"
                                        />
                                        <span className="text-sm text-white">Description</span>
                                    </label>
                                    <label
                                        key="customLinks"
                                        className="flex items-center gap-2 cursor-pointer select-none"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={catOptionalFields.includes("customLinks")}
                                            onChange={(e) =>
                                                setCatOptionalFields((prev) =>
                                                    e.target.checked
                                                        ? [...prev, "customLinks"]
                                                        : prev.filter((f) => f !== "customLinks")
                                                )
                                            }
                                            className="w-4 h-5 accent-purple-500 rounded"
                                        />
                                        <span className="text-sm text-white">Custom Links</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleAddCategory}
                            disabled={isSavingCategories}
                            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Plus size={18} /> Add Category
                        </button>
                    </div>

                    {categories.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                            <p className="text-gray-500">No categories yet. Add one above.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categories.map((cat, index) => (
                                <div
                                    key={`${cat.label}-${index}`}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between gap-3"
                                >
                                    <div>
                                        <h4 className="font-bold text-white text-lg">
                                            {cat.label}
                                        </h4>
                                        <p className="text-gray-400 text-sm">{cat.actionLabel}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteCategory(index)}
                                        className="self-start p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-red-600 hover:text-white transition-colors"
                                        title="Delete category"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : subSection === "settings" ? (
                <div className="space-y-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-1">
                            <Radio size={20} className="text-purple-400" />
                            <h3 className="text-lg font-bold text-white">Redirect Links</h3>
                        </div>
                        <p className="text-sm text-gray-400 mb-6">
                            Where users are sent after submitting a Marketplace form. Only one link
                            can be active at a time.
                        </p>

                        {redirectLinks.length === 0 ? (
                            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10 border-dashed mb-6">
                                <p className="text-gray-500">
                                    No redirect links yet. Add one below.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 mb-6">
                                {redirectLinks.map((link, index) => (
                                    <div
                                        key={index}
                                        className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-white text-sm">
                                                {link.label}
                                            </p>
                                            <p className="text-gray-500 text-xs truncate">
                                                {link.url}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleSetActiveLink(index)}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${link.active ? "bg-purple-600 text-white shadow-lg" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}
                                            >
                                                <Check size={14} />
                                                {link.active ? "Active" : "Set Active"}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRedirectLink(index)}
                                                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-red-600 hover:text-white transition-colors"
                                                title="Delete link"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Label
                                </label>
                                <input
                                    type="text"
                                    value={linkLabel}
                                    onChange={(e) => setLinkLabel(e.target.value)}
                                    placeholder="e.g. WhatsApp"
                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    URL
                                </label>
                                <input
                                    type="text"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <button
                                onClick={handleAddRedirectLink}
                                className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center gap-2"
                            >
                                <Plus size={18} /> Add Link
                            </button>
                            <button
                                onClick={handleSaveRedirectLinks}
                                disabled={isSavingLinks}
                                className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-500 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Check size={18} /> Save
                            </button>
                        </div>
                    </div>
                </div>
            ) : listingView === "list" ? (
                <div>
                    <div className="flex justify-end mb-8">
                        <button
                            onClick={handleAddNewListing}
                            className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-purple-900/40 hover:bg-purple-500 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Plus size={20} /> Add New Listing
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {listings.map((listing) => (
                            <div
                                key={listing.id}
                                className={`bg-white/5 border border-white/10 p-6 rounded-[2rem] transition-all ${listing.isVisible === false || isExpired(listing) ? "opacity-60" : ""}`}
                            >
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    {listing.isVisible === false && (
                                        <span className="bg-red-500/90 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                            Hidden
                                        </span>
                                    )}
                                    {isExpired(listing) && (
                                        <span className="bg-orange-500/90 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1">
                                            <Clock size={10} /> Expired
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-xl text-white mb-1">
                                    {listing.itemName}
                                </h3>
                                <p className="text-gray-400 text-sm mb-1">
                                    ₹{listing.askingPrice} · {listing.category}
                                </p>
                                <p className="text-gray-500 text-xs mb-6">
                                    Expires: {listing.expiryDate || "No expiry"}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEditListing(listing)}
                                        className="flex-1 py-3 rounded-xl border border-white/10 text-gray-300 font-bold hover:bg-white hover:text-black transition-all text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleToggleVisibility(listing)}
                                        className="p-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
                                        title={listing.isVisible === false ? "Show" : "Hide"}
                                    >
                                        {listing.isVisible === false ? (
                                            <Eye size={18} />
                                        ) : (
                                            <EyeOff size={18} />
                                        )}
                                    </button>
                                    <button
                                        onClick={() =>
                                            setConfirmModal({
                                                isOpen: true,
                                                type: "listing",
                                                id: listing.id,
                                                name: listing.itemName,
                                            })
                                        }
                                        className="p-3 rounded-xl border border-white/10 text-gray-300 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <MarketplaceListingForm
                    initialData={selectedListing}
                    onSave={handleSaveListing}
                    onCancel={() => setListingView("list")}
                    isSaving={isSaving}
                />
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => handleDeleteListing(confirmModal.id)}
                title="Delete Listing?"
                message={`Are you sure you want to delete "${confirmModal.name}"? This will permanently remove it from the database.`}
                confirmLabel="Delete Listing"
            />
        </div>
    );
}
