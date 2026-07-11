import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { collection, getDocs } from "firebase/firestore";
import {
    saveListing,
    updateListing,
    deleteListing,
    updateMarketplaceRequest,
} from "@/lib/repositories";
import toast from "react-hot-toast";
import { Trash, Eye, EyeOff, Plus, MessageCircle, Check, Clock } from "lucide-react";
import MarketplaceListingForm from "./MarketplaceListingForm";
import ConfirmModal from "../../components/ConfirmModal";

export default function MarketplaceTab() {
    const [subSection, setSubSection] = useState("requests"); // requests, listings
    const [requests, setRequests] = useState([]);
    const [listings, setListings] = useState([]);
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

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [requestsSnap, listingsSnap] = await Promise.all([
                getDocs(collection(db, COLLECTIONS.MARKETPLACE_REQUESTS)),
                getDocs(collection(db, COLLECTIONS.MARKETPLACE_LISTINGS)),
            ]);
            setRequests(requestsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setListings(listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
