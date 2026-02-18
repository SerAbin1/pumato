import { useState, useEffect } from "react";
import Image from "next/image";
import { Utensils, Trash, Save, Eye, EyeOff, Upload, Plus, X, Search, Clock } from "lucide-react";
import Fuse from "fuse.js";
import { toTitleCase } from "@/lib/formatters";
import FormInput from "./FormInput";
import StickyActionBar from "./StickyActionBar";
import CustomSelect from "../../components/CustomSelect";

export default function RestaurantForm({ initialData, onSave, onCancel, isSaving = false, isPartnerView = false }) {
    const [formData, setFormData] = useState({
        name: "", image: "", cuisine: "", deliveryTime: "30 mins", offer: "", priceForTwo: "",
        baseDeliveryCharge: "30", extraItemThreshold: "3", extraItemCharge: "10", minOrderAmount: "0",
        isVisible: true,
        isAvailable: true,
        categories: [],
        menu: [],
        ...initialData
    });

    // Update formData if initialData changes (important for switching between restaurants)
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                categories: initialData.categories || [],
                outOfStockCategories: initialData.outOfStockCategories || [],
                menu: initialData.menu || []
            }));
        }
    }, [initialData]);

    const [menuSearchQuery, setMenuSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    const handleFileUpload = async (e, setUrlCallback) => {
        const file = e.target.files[0];
        if (!file) return;

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "pumato");

        try {
            const res = await fetch("https://api.cloudinary.com/v1_1/dykcjfxx5/image/upload", {
                method: "POST",
                body: data
            });
            const result = await res.json();
            if (result.secure_url) {
                setUrlCallback(result.secure_url);
            } else {
                alert("Upload failed: " + (result.error?.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Upload error", err);
            alert("Upload failed");
        }
    };

    // --- MENU HANDLERS ---
    const addMenuItem = () => {
        setFormData({ ...formData, menu: [...(formData.menu || []), { id: Date.now().toString(), name: "", price: "", description: "", image: "", isVeg: null, isVisible: true, category: "" }] });
    };

    const updateMenuItem = (index, field, value) => {
        const newMenu = [...formData.menu];
        if (field === "isVisible" && value === false) {
            newMenu[index].hiddenAt = new Date().toISOString();
        } else if (field === "isVisible" && value === true) {
            newMenu[index].hiddenAt = null;
        }
        newMenu[index][field] = value;
        setFormData({ ...formData, menu: newMenu });
    };

    const removeMenuItem = (index) => {
        const newMenu = formData.menu.filter((_, i) => i !== index);
        setFormData({ ...formData, menu: newMenu });
    };

    const handleSave = () => {
        // Prepare data for saving
        const formattedData = {
            ...formData,
            name: (formData.name || "").toUpperCase(),
            cuisine: toTitleCase(formData.cuisine || ""),
            menu: (formData.menu || []).map(item => ({
                ...item,
                name: toTitleCase(item.name || ""),
                category: (item.category || "").toUpperCase()
            }))
        };
        onSave(formattedData);
    };

    return (
        <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-5xl mx-auto shadow-2xl relative">
            <h2 className="text-3xl font-black mb-10 text-white border-b border-white/10 pb-6">
                {initialData?.id ? "Edit Restaurant" : "Create New Restaurant"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <FormInput label="Restaurant Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Image URL</label>
                    <div className="flex gap-2">
                        <input className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." />
                        <label className="bg-white/10 hover:bg-white/20 p-4 rounded-xl cursor-pointer text-white transition-colors">
                            <Upload size={24} />
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setFormData(prev => ({ ...prev, image: url })))} />
                        </label>
                    </div>
                </div>
                <FormInput label="Cuisine" value={formData.cuisine} onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })} />
                {!isPartnerView && (
                    <FormInput label="Delivery Time" value={formData.deliveryTime} onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })} />
                )}
                <FormInput label="Offer Badge" value={formData.offer} onChange={(e) => setFormData({ ...formData, offer: e.target.value })} placeholder="e.g 50% OFF" />
                <FormInput label="Extra Info / Offer" value={formData.priceForTwo} onChange={(e) => setFormData({ ...formData, priceForTwo: e.target.value })} placeholder="e.g. Buy 1 Get 1 Free" />

                {!isPartnerView && (
                    <div className="col-span-full grid grid-cols-1 md:grid-cols-4 gap-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                        <FormInput label="Base Del. Charge (₹)" type="number" value={formData.baseDeliveryCharge} onChange={(e) => setFormData({ ...formData, baseDeliveryCharge: e.target.value })} />
                        <FormInput label="Extra Item Threshold" type="number" value={formData.extraItemThreshold} onChange={(e) => setFormData({ ...formData, extraItemThreshold: e.target.value })} />
                        <FormInput label="Extra Charge (₹)" type="number" value={formData.extraItemCharge} onChange={(e) => setFormData({ ...formData, extraItemCharge: e.target.value })} />
                        <FormInput label="Min Order Amt (₹)" type="number" value={formData.minOrderAmount || "0"} onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })} placeholder="0" />
                    </div>
                )}

                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Temporarily Closed Toggle */}
                    <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                id="restaurant-visibility"
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                                checked={formData.isVisible !== false}
                                onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                                style={{ right: formData.isVisible !== false ? '0' : 'auto', left: formData.isVisible !== false ? 'auto' : '0' }}
                            />
                            <label htmlFor="restaurant-visibility" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isVisible !== false ? 'bg-green-500' : 'bg-gray-600'}`}></label>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="restaurant-visibility" className="text-sm font-bold text-white cursor-pointer select-none flex items-center gap-2">
                                {formData.isVisible !== false ? <Clock size={18} className="text-green-400" /> : <Clock size={18} className="text-red-400" />}
                                Open for Orders
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Status: {formData.isVisible !== false ? "OPEN" : "TEMPORARILY CLOSED"}</p>
                        </div>
                    </div>

                    {/* Database Availability Toggle */}
                    <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-red-500/10">
                        <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                id="restaurant-availability"
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                                checked={formData.isAvailable !== false}
                                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                                style={{ right: formData.isAvailable !== false ? '0' : 'auto', left: formData.isAvailable !== false ? 'auto' : '0' }}
                            />
                            <label htmlFor="restaurant-availability" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.isAvailable !== false ? 'bg-blue-500' : 'bg-gray-600'}`}></label>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="restaurant-availability" className="text-sm font-bold text-white cursor-pointer select-none flex items-center gap-2">
                                {formData.isAvailable !== false ? <Eye size={18} className="text-blue-400" /> : <EyeOff size={18} className="text-gray-400" />}
                                Account Active
                            </label>
                            <p className="text-xs text-gray-500 mt-1">{formData.isAvailable !== false ? "Visible in search and lists" : "HIDDEN from all users"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Management */}
            <div className="border-t border-white/10 pt-10 mb-10">
                <h3 className="font-bold text-2xl text-white mb-6">Restaurant Categories</h3>
                <div className="flex gap-4 mb-6">
                    <input
                        className="flex-1 p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                        placeholder="Add Custom Category for this Restaurant"
                        id="local-cat-input"
                    />
                    <button
                        onClick={() => {
                            const input = document.getElementById("local-cat-input");
                            if (input && input.value.trim()) {
                                setFormData(prev => ({
                                    ...prev,
                                    categories: [...(prev.categories || []), input.value.trim()]
                                }));
                                input.value = "";
                            }
                        }}
                        className="bg-orange-600 text-white px-8 rounded-xl font-bold hover:bg-orange-500 transition-colors shadow-lg shadow-orange-900/40"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(formData.categories || []).map(cat => {
                        const isOutOfStock = (formData.outOfStockCategories || []).includes(cat);
                        return (
                            <div key={cat} className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all group ${isOutOfStock ? 'bg-red-500/20 border-red-500/30' : 'bg-white/10 border-white/10 hover:border-white/30'}`}>
                                <button
                                    onClick={() => {
                                        setFormData(prev => {
                                            const outOfStock = prev.outOfStockCategories || [];
                                            return {
                                                ...prev,
                                                outOfStockCategories: isOutOfStock
                                                    ? outOfStock.filter(c => c !== cat)
                                                    : [...outOfStock, cat]
                                            };
                                        });
                                    }}
                                    className={`text-xs font-bold px-2 py-0.5 rounded ${isOutOfStock ? 'bg-red-500 text-white' : 'bg-gray-600 text-gray-300 hover:bg-orange-500 hover:text-white'}`}
                                    title={isOutOfStock ? "Mark as Available" : "Mark as Out of Stock"}
                                >
                                    {isOutOfStock ? "OUT" : "IN"}
                                </button>
                                <span className={`text-sm font-bold ${isOutOfStock ? 'text-red-400 line-through' : 'text-gray-200'}`}>{cat}</span>
                                <button
                                    onClick={() => {
                                        setFormData(prev => ({
                                            ...prev,
                                            categories: (prev.categories || []).filter(c => c !== cat),
                                            outOfStockCategories: (prev.outOfStockCategories || []).filter(c => c !== cat)
                                        }));
                                    }}
                                    className="text-gray-500 hover:text-red-500 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-gray-500 mt-4 italic">
                    * Click IN/OUT to toggle category availability. OUT categories hide all items in that section.
                </p>
            </div>

            <div className="border-t border-white/10 pt-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-2xl text-white">Menu Management</h3>
                    <button onClick={addMenuItem} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <Plus size={18} /> Add Item
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search menu items by name..."
                        value={menuSearchQuery}
                        onChange={(e) => setMenuSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium placeholder-gray-500"
                    />
                    {menuSearchQuery && (
                        <button
                            onClick={() => setMenuSearchQuery("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Category Filter Dropdown */}
                <div className="mb-6">
                    <CustomSelect
                        options={[
                            { label: "All Categories", value: "all" },
                            ...(formData.categories || []).map(cat => ({ label: cat, value: cat }))
                        ]}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        className="w-full md:w-64"
                    />
                </div>

                {/* Item Count */}
                {(formData.menu || []).length > 0 && (
                    <div className="mb-4 text-sm text-gray-400 font-medium">
                        {(() => {
                            const menu = formData.menu || [];
                            if (!menuSearchQuery) return `Showing ${menu.length} of ${menu.length} items`;

                            const fuse = new Fuse(menu, {
                                keys: ['name'],
                                threshold: 0.3,
                                includeScore: true
                            });
                            const results = fuse.search(menuSearchQuery);

                            // Also include exact substring matches
                            const query = menuSearchQuery.toLowerCase();
                            const substringMatches = menu.filter(item =>
                                item.name.toLowerCase().includes(query)
                            );

                            // Combine and deduplicate
                            const allMatches = [...results.map(r => r.item)];
                            substringMatches.forEach(item => {
                                if (!allMatches.find(m => m.id === item.id)) {
                                    allMatches.push(item);
                                }
                            });

                            return `Showing ${allMatches.length} of ${menu.length} items`;
                        })()}
                    </div>
                )}

                <div className="space-y-6">
                    {(() => {
                        let menu = formData.menu || [];

                        // Filter by Category first
                        if (selectedCategory !== "all") {
                            menu = menu.filter(item => item.category === selectedCategory);
                        }

                        if (!menuSearchQuery) return menu;

                        const query = menuSearchQuery.toLowerCase().trim();
                        const fuse = new Fuse(menu, {
                            keys: ['name'],
                            threshold: 0.3,
                            includeScore: true
                        });
                        const results = fuse.search(menuSearchQuery);

                        const scoredResults = results.map(result => {
                            const itemName = result.item.name.toLowerCase();
                            let adjustedScore = result.score;
                            if (itemName === query) adjustedScore -= 0.5;
                            else if (itemName.startsWith(query)) adjustedScore -= 0.3;
                            else if (itemName.includes(query)) adjustedScore -= 0.2;
                            return { item: result.item, score: adjustedScore };
                        });

                        const substringMatches = menu.filter(item => {
                            const itemName = item.name.toLowerCase();
                            return itemName.includes(query) && !scoredResults.find(r => r.item.id === item.id);
                        });

                        const allMatches = [
                            ...scoredResults,
                            ...substringMatches.map(item => ({ item, score: 0 }))
                        ];

                        allMatches.sort((a, b) => (a.score || 1) - (b.score || 1));
                        return allMatches.map(m => m.item);
                    })().map((item, idx) => {
                        const actualIdx = (formData.menu || []).indexOf(item);
                        return (
                            <div key={item.id} className={`p-6 border border-white/10 rounded-3xl bg-black/20 relative group ${item.isVisible === false ? 'opacity-60' : ''}`}>
                                <button onClick={() => removeMenuItem(actualIdx)} className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"><Trash size={16} /></button>
                                <button
                                    onClick={() => updateMenuItem(actualIdx, "isVisible", item.isVisible === false ? true : false)}
                                    className="absolute -top-3 -left-3 bg-purple-500 text-white p-2 rounded-full hover:bg-purple-600 transition-colors shadow-lg"
                                    title={item.isVisible === false ? "Show Item" : "Hide Item"}
                                >
                                    {item.isVisible === false ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                {item.isVisible === false && (
                                    <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur-md text-white px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg z-10">
                                        Hidden
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="col-span-1 space-y-4">
                                        <input className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white font-bold" placeholder="Item Name" value={item.name} onChange={(e) => updateMenuItem(actualIdx, "name", e.target.value)} />
                                        <input className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white" placeholder="Price" type="number" value={item.price} onChange={(e) => updateMenuItem(actualIdx, "price", e.target.value)} />
                                        <input className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white text-xs" placeholder="Extra Info (e.g. Must Try)" value={item.extraInfo || ""} onChange={(e) => updateMenuItem(actualIdx, "extraInfo", e.target.value)} />
                                        <select
                                            className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white text-xs appearance-none focus:outline-none focus:border-orange-500/50"
                                            value={item.category || ""}
                                            onChange={(e) => updateMenuItem(actualIdx, "category", e.target.value)}
                                        >
                                            <option value="" disabled className="bg-gray-900 text-gray-400">Select Category</option>
                                            {(formData.categories || []).map(cat => (
                                                <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                                            ))}
                                            {item.category && !(formData.categories || []).includes(item.category) && (
                                                <option value={item.category} className="bg-gray-900">{item.category} (Legacy)</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <textarea className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white h-full resize-none min-h-[100px]" placeholder="Description" value={item.description} onChange={(e) => updateMenuItem(actualIdx, "description", e.target.value)} />
                                    </div>
                                    <div className="col-span-1 space-y-4">
                                        <div className="flex gap-2">
                                            <input className="p-3 bg-white/5 border border-white/10 rounded-lg w-full text-white text-xs" placeholder="Image URL" value={item.image} onChange={(e) => updateMenuItem(actualIdx, "image", e.target.value)} />
                                            <label className="bg-white/10 hover:bg-white/20 p-2 rounded-lg cursor-pointer text-white transition-colors flex items-center justify-center min-w-[40px]">
                                                <Upload size={16} />
                                                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (url) => updateMenuItem(actualIdx, "image", url))} />
                                            </label>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isVeg === true}
                                                    onChange={(e) => {
                                                        const val = e.target.checked;
                                                        updateMenuItem(actualIdx, "isVeg", val ? true : null);
                                                    }}
                                                    id={`veg-${actualIdx}`}
                                                    className="w-5 h-5 accent-green-500 rounded"
                                                />
                                                <label htmlFor={`veg-${actualIdx}`} className="text-sm font-bold text-green-400">Pure Veg</label>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={item.isVeg === false}
                                                    onChange={(e) => {
                                                        const val = e.target.checked;
                                                        updateMenuItem(actualIdx, "isVeg", val ? false : null);
                                                    }}
                                                    id={`nonveg-${actualIdx}`}
                                                    className="w-5 h-5 accent-red-500 rounded"
                                                />
                                                <label htmlFor={`nonveg-${actualIdx}`} className="text-sm font-bold text-red-500">Non-Veg</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <StickyActionBar
                onSave={handleSave}
                onCancel={onCancel}
                isSaving={isSaving}
                title={initialData?.id ? "Editing Restaurant" : "Creating Restaurant"}
                saveLabel={initialData?.id ? "Update Restaurant" : "Create Restaurant"}
            >
                <button
                    onClick={addMenuItem}
                    className="bg-white text-black px-4 md:px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 text-xs md:text-sm"
                >
                    <Plus size={18} /> Add Item
                </button>
            </StickyActionBar>
        </div>
    );
}
