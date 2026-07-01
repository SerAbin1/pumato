import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import FormInput from "./FormInput";
import StickyActionBar from "./StickyActionBar";
import { MARKETPLACE_CATEGORIES, DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";

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
        category: MARKETPLACE_CATEGORIES[0],
        campus: DEFAULT_CAMPUS_CONFIG[0].id,
        sellerName: "",
        sellerWhatsApp: "",
        images: [],
        isVisible: true,
        expiryDate: "",
        ...initialData,
    });
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        try {
            const uploadedUrls = await Promise.all(
                files.map(async (file) => {
                    const storageRef = ref(storage, `marketplace/${Date.now()}-${file.name}`);
                    await uploadBytes(storageRef, file);
                    return getDownloadURL(storageRef);
                })
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

    const handleSave = () => {
        const formattedData = {
            ...formData,
            itemName: (formData.itemName || "").trim(),
            description: (formData.description || "").trim(),
            askingPrice: Number(formData.askingPrice) || 0,
            sellerName: (formData.sellerName || "").trim(),
            sellerWhatsApp: (formData.sellerWhatsApp || "").trim(),
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
                        Category
                    </label>
                    <select
                        className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                        {MARKETPLACE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-gray-900">
                                {cat}
                            </option>
                        ))}
                    </select>
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
                        Images
                    </label>
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
