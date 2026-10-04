import { useState, useEffect } from "react";
import { Upload, X, Loader2, Link, Plus } from "lucide-react";
import { uploadImage } from "@/lib/uploadImage";
import FormInput from "./FormInput";
import StickyActionBar from "./StickyActionBar";
import { DEFAULT_CAMPUS_CONFIG, COLLECTIONS, SITE_CONTENT_DOCS } from "@/lib/constants";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CUSTOM_LINK_TYPES } from "@/lib/customLinks";
import { saveMarketplaceFilters } from "@/lib/repositories";
import toast from "react-hot-toast";
import {
    PROMOTION_SURFACES,
    REACH_PRESETS,
    deriveTier,
    normalizePromotion,
} from "@/lib/marketplacePromotions";

function ReachPicker({ value, onChange }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mr-1">
                Reach
            </span>
            {REACH_PRESETS.map((r) => (
                <button
                    key={r}
                    type="button"
                    onClick={() => onChange(r)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${value === r ? "border-purple-500 bg-purple-500/20 text-white" : "border-white/10 text-gray-300 hover:bg-white/5"}`}
                >
                    {r}%
                </button>
            ))}
        </div>
    );
}

function PlacementToggle({ id, label, description, enabled, onToggle, children }) {
    return (
        <div
            className={`p-4 rounded-xl border space-y-4 transition-colors ${enabled ? "border-purple-500 bg-purple-500/10" : "border-white/10 bg-black/20"}`}
        >
            <label htmlFor={id} className="flex items-start gap-3 cursor-pointer select-none">
                <input
                    type="checkbox"
                    id={id}
                    checked={enabled}
                    onChange={(e) => onToggle(e.target.checked)}
                    className="w-5 h-5 mt-0.5 accent-purple-500"
                />
                <span>
                    <span className="block text-sm font-bold text-white">{label}</span>
                    <span className="block text-xs text-gray-400 mt-1">{description}</span>
                </span>
            </label>
            {enabled && <div className="space-y-4 pl-8">{children}</div>}
        </div>
    );
}

export default function MarketplaceListingForm({
    initialData,
    onSave,
    onCancel,
    isSaving = false,
}) {
    const [formData, setFormData] = useState({
        itemName: "",
        description: "",
        askingPrice: "",
        filter: "",
        campus: DEFAULT_CAMPUS_CONFIG[0].id,
        sellerName: "",
        sellerWhatsApp: "",
        images: [],
        isVisible: true,
        expiryDate: "",
        customLinks: [],
        ...initialData,
        promotion: normalizePromotion(initialData?.promotion),
    });
    const [filters, setFilters] = useState([]);
    const [creatingFilter, setCreatingFilter] = useState(false);
    const [newFilterName, setNewFilterName] = useState("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const snap = await getDoc(
                    doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_FILTERS)
                );
                if (snap.exists()) {
                    setFilters(snap.data().filters || []);
                }
            } catch (err) {
                console.error("Error fetching marketplace filters:", err);
            }
        };
        fetchFilters();
    }, []);

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const uploadedUrls = await Promise.all(
                files.map((file) => uploadImage(file, "marketplace"))
            );
            setFormData((prev) => ({ ...prev, images: [...(prev.images || []), ...uploadedUrls] }));
        } catch (err) {
            console.error("Image upload error", err);
            alert("Image upload failed");
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (url) => {
        setFormData((prev) => ({ ...prev, images: prev.images.filter((img) => img !== url) }));
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

    const setPromotion = (patch) =>
        setFormData((prev) => ({ ...prev, promotion: { ...prev.promotion, ...patch } }));

    const setPlacement = (placement, patch) =>
        setFormData((prev) => ({
            ...prev,
            promotion: {
                ...prev.promotion,
                [placement]: { ...prev.promotion[placement], ...patch },
            },
        }));

    const { inFeed, popup, targetCampuses } = formData.promotion;

    const toggleInList = (list, value) =>
        list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

    const handleSave = async () => {
        let filter = formData.filter;
        if (newFilterName.trim()) {
            filter = newFilterName.trim();
            if (!filters.some((f) => f.label === filter)) {
                const updated = [...filters, { label: filter }];
                setFilters(updated);
                try {
                    await saveMarketplaceFilters({ filters: updated });
                } catch (err) {
                    console.error("Failed to save new filter", err);
                    toast.error("Failed to save new filter");
                    return;
                }
            }
        }
        const customLinks = (formData.customLinks || []).filter((l) => l.type && l.link.trim());
        const formattedData = {
            ...formData,
            filter,
            itemName: (formData.itemName || "").trim(),
            description: (formData.description || "").trim(),
            askingPrice: Number(formData.askingPrice) || 0,
            sellerName: (formData.sellerName || "").trim(),
            sellerWhatsApp: (formData.sellerWhatsApp || "").trim(),
            customLinks,
        };
        onSave(formattedData);
    };

    return (
        <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-5xl mx-auto shadow-2xl relative">
            <h2 className="text-3xl font-black mb-10 text-white border-b border-white/10 pb-6">
                {initialData?.id ? "Edit Listing" : "Create New Listing"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <FormInput
                    label="Item Name"
                    value={formData.itemName}
                    onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                />
                <FormInput
                    label="Asking Price (₹)"
                    type="number"
                    value={formData.askingPrice}
                    onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                />

                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Filter
                    </label>
                    <select
                        className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                        value={creatingFilter ? "__new__" : formData.filter}
                        onChange={(e) => {
                            if (e.target.value === "__new__") {
                                setCreatingFilter(true);
                                setNewFilterName("");
                            } else {
                                setCreatingFilter(false);
                                setNewFilterName("");
                                setFormData({ ...formData, filter: e.target.value });
                            }
                        }}
                    >
                        <option value="" className="bg-gray-900">
                            Select a filter
                        </option>
                        {formData.filter && !filters.some((f) => f.label === formData.filter) && (
                            <option value={formData.filter} className="bg-gray-900">
                                {formData.filter}
                            </option>
                        )}
                        {filters.map((f) => (
                            <option key={f.label} value={f.label} className="bg-gray-900">
                                {f.label}
                            </option>
                        ))}
                        <option value="__new__" className="bg-gray-900">
                            + Create new filter...
                        </option>
                    </select>
                    {creatingFilter && (
                        <input
                            type="text"
                            value={newFilterName}
                            onChange={(e) => setNewFilterName(e.target.value)}
                            placeholder="New filter name e.g. Second-hand"
                            className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                        />
                    )}
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Campus
                    </label>
                    <select
                        className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                        value={formData.campus}
                        onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                    >
                        {DEFAULT_CAMPUS_CONFIG.map((c) => (
                            <option key={c.id} value={c.id} className="bg-gray-900">
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <FormInput
                    label="Seller Name"
                    value={formData.sellerName}
                    onChange={(e) => setFormData({ ...formData, sellerName: e.target.value })}
                />
                <FormInput
                    label="Seller WhatsApp"
                    value={formData.sellerWhatsApp}
                    onChange={(e) => setFormData({ ...formData, sellerWhatsApp: e.target.value })}
                    placeholder="91XXXXXXXXXX"
                />
                <FormInput
                    label="Expiry Date"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />

                <div className="col-span-full space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Description
                    </label>
                    <textarea
                        className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium h-32 resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="col-span-full space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Custom Links
                    </label>
                    <div className="space-y-3">
                        {(formData.customLinks || []).map((link, index) => {
                            const typeDef = CUSTOM_LINK_TYPES.find((t) => t.id === link.type);
                            const Icon = typeDef?.icon || Link;
                            return (
                                <div
                                    key={index}
                                    className="flex gap-3 items-start bg-white/5 rounded-xl p-3 border border-white/10"
                                >
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="relative">
                                            <Icon
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                                                size={18}
                                            />
                                            <select
                                                value={link.type}
                                                onChange={(e) =>
                                                    handleLinkChange(index, "type", e.target.value)
                                                }
                                                className="w-full pl-11 pr-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm appearance-none"
                                            >
                                                <option value="" className="bg-gray-900">
                                                    Select type...
                                                </option>
                                                {CUSTOM_LINK_TYPES.map((t) => (
                                                    <option
                                                        key={t.id}
                                                        value={t.id}
                                                        className="bg-gray-900"
                                                    >
                                                        {t.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <input
                                            type="url"
                                            placeholder={typeDef?.placeholder || "https://..."}
                                            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm"
                                            value={link.link}
                                            onChange={(e) =>
                                                handleLinkChange(index, "link", e.target.value)
                                            }
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLink(index)}
                                        className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-red-600 hover:text-white transition-colors mt-1"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            );
                        })}
                        <button
                            type="button"
                            onClick={handleAddLink}
                            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-bold transition-colors"
                        >
                            <Plus size={16} /> Add a Link
                        </button>
                    </div>
                </div>

                <div className="col-span-full space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Images
                    </label>
                    <p className="text-xs text-gray-500 -mt-1">
                        Any image size or shape works. Photos are shown in a fixed frame on the
                        listing, and buyers can tap to view the full uncropped image. Landscape
                        photos fill the frame best.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        {(formData.images || []).map((img) => (
                            <div
                                key={img}
                                className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img} alt="" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => removeImage(img)}
                                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                        <label className="w-24 h-24 flex flex-col items-center justify-center gap-1 bg-white/10 hover:bg-white/20 rounded-xl cursor-pointer text-white transition-colors border border-white/10 border-dashed">
                            {uploading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <Upload size={24} />
                            )}
                            <span className="text-[10px] font-bold">
                                {uploading ? "Uploading" : "Add"}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>

                <div className="col-span-full space-y-5 bg-white/5 p-5 rounded-2xl border border-white/5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                        Promotion
                    </label>
                    <span className="ml-3 text-[10px] font-bold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full uppercase tracking-wider border border-purple-500/30">
                        {deriveTier(formData.promotion)}
                    </span>
                    <p className="text-xs text-gray-500 -mt-2">
                        Every listing appears on the Marketplace page. Turn on either or both below
                        to promote it further.
                    </p>

                    <PlacementToggle
                        id="promo-in-feed"
                        label="In-feed"
                        description="Appears as a sponsored card in-between items while browsing."
                        enabled={inFeed.enabled}
                        onToggle={(enabled) => setPlacement("inFeed", { enabled })}
                    >
                        <ReachPicker
                            value={inFeed.reach}
                            onChange={(reach) => setPlacement("inFeed", { reach })}
                        />
                        <div className="flex flex-wrap items-center gap-4">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Show in
                            </span>
                            {PROMOTION_SURFACES.map((s) => (
                                <label
                                    key={s.id}
                                    className="flex items-center gap-2 text-sm text-white cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={inFeed.surfaces.includes(s.id)}
                                        onChange={() =>
                                            setPlacement("inFeed", {
                                                surfaces: toggleInList(inFeed.surfaces, s.id),
                                            })
                                        }
                                        className="w-4 h-4 accent-purple-500"
                                    />
                                    {s.label}
                                </label>
                            ))}
                        </div>
                    </PlacementToggle>

                    <PlacementToggle
                        id="promo-popup"
                        label="Popup"
                        description="Pops up and interrupts the flow until the user dismisses it. Shown at most once a day per visitor."
                        enabled={popup.enabled}
                        onToggle={(enabled) => setPlacement("popup", { enabled })}
                    >
                        <ReachPicker
                            value={popup.reach}
                            onChange={(reach) => setPlacement("popup", { reach })}
                        />
                    </PlacementToggle>

                    {(inFeed.enabled || popup.enabled) && (
                        <>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
                                    Target campuses
                                </span>
                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={targetCampuses.length === 0}
                                            onChange={() => setPromotion({ targetCampuses: [] })}
                                            className="w-4 h-4 accent-purple-500"
                                        />
                                        All campuses
                                    </label>
                                    {DEFAULT_CAMPUS_CONFIG.map((c) => (
                                        <label
                                            key={c.id}
                                            className="flex items-center gap-2 text-sm text-white cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={targetCampuses.includes(c.id)}
                                                onChange={() =>
                                                    setPromotion({
                                                        targetCampuses: toggleInList(
                                                            targetCampuses,
                                                            c.id
                                                        ),
                                                    })
                                                }
                                                className="w-4 h-4 accent-purple-500"
                                            />
                                            {c.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="col-span-full flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5 w-fit">
                    <input
                        type="checkbox"
                        id="listing-visibility"
                        checked={formData.isVisible !== false}
                        onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                        className="w-5 h-5 accent-purple-500 rounded"
                    />
                    <label
                        htmlFor="listing-visibility"
                        className="text-sm font-bold text-white cursor-pointer select-none"
                    >
                        Visible on Marketplace
                    </label>
                </div>
            </div>

            <StickyActionBar
                onSave={handleSave}
                onCancel={onCancel}
                isSaving={isSaving}
                title={initialData?.id ? "Editing Listing" : "Creating Listing"}
                saveLabel={initialData?.id ? "Update Listing" : "Create Listing"}
            />
        </div>
    );
}
