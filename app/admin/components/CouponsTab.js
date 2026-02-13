import { useState } from "react";
import { Tag, Trash, Eye, EyeOff, Search, Utensils, Plus, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Fuse from "fuse.js";
import FormInput from "./FormInput";
import StickyActionBar from "./StickyActionBar";

export default function CouponsTab({ coupons, restaurants, fetchData, user }) {
    const [activeTab, setActiveTab] = useState("list");
    const [editingId, setEditingId] = useState(null);
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [couponTargetType, setCouponTargetType] = useState("item"); // "item" or "category"
    const [isSaving, setIsSaving] = useState(false);

    const [couponForm, setCouponForm] = useState({
        code: "", type: "FLAT", value: "", minOrder: "0", description: "", isVisible: true, isActive: true, usageLimit: "", restaurantId: null, itemId: null
    });

    // --- HANDLERS ---

    const handleToggleActive = async (e, coupon) => {
        e.stopPropagation();
        const newStatus = !(coupon.isActive !== false); // Toggle

        // Optimistic update - in a real app we might want to lift this state up or wait for fetch
        // But since we fetch data after, we can just wait for re-render or assume success for UI
        // Ideally we should update the parent's state, but for now we rely on fetchData to refresh everything.
        // To make it instant, we could have a local 'coupons' state copy, but let's stick to simple props first.
        // Actually, props are read-only. We can't mutate 'coupons'.
        // We will just invoke the function to update backend and then fetchData().
        // If we want optimistic UI, we need local state initialized from props.
        // For now, I'll just do the request and refresh.

        const payload = {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            minOrder: coupon.minOrder,
            description: coupon.description,
            isVisible: coupon.isVisible,
            isActive: newStatus,
            usageLimit: coupon.usageLimit,
            usedCount: coupon.usedCount,
            restaurantId: coupon.restaurantId,
            itemId: coupon.itemId
        };

        try {
            const idToken = await user.getIdToken();
            const { error } = await supabase.functions.invoke("manage-coupons", {
                body: { action: "UPDATE", payload },
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error(error);
            alert("Failed to toggle status");
        }
    };

    const handleAddNewCoupon = () => {
        setEditingId(null);
        setCouponForm({ code: "", type: "FLAT", value: "", minOrder: "0", description: "", isVisible: true, isActive: true, usageLimit: "", restaurantId: null, itemId: null });
        setCouponTargetType("item");
        setItemSearchQuery("");
        setActiveTab("form");
    };

    const handleEditCoupon = (coupon) => {
        setEditingId(coupon.id);
        const targetId = coupon.itemId || coupon.item_id;
        const isCategory = String(targetId).startsWith("CATEGORY:");
        setCouponTargetType(isCategory ? "category" : "item");
        setCouponForm({
            code: coupon.code || "",
            type: coupon.type || "FLAT",
            value: coupon.value || "",
            minOrder: coupon.minOrder || coupon.min_order || "0",
            description: coupon.description || "",
            isVisible: coupon.isVisible !== undefined ? coupon.isVisible : (coupon.is_visible !== undefined ? coupon.is_visible : true),
            isActive: coupon.isActive !== undefined ? coupon.isActive : (coupon.is_active !== undefined ? coupon.is_active : true),
            usageLimit: coupon.usageLimit || coupon.usage_limit || "",
            usedCount: coupon.usedCount || coupon.used_count || 0,
            restaurantId: coupon.restaurantId || coupon.restaurant_id || null,
            itemId: targetId || null
        });
        setActiveTab("form");
    };

    const handleDeleteCoupon = async (id) => {
        if (!confirm("Delete this coupon?")) return;
        try {
            const idToken = await user.getIdToken();
            const { error } = await supabase.functions.invoke("manage-coupons", {
                body: { action: "DELETE", payload: { id } },
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (error) throw error;
            await fetchData();
        } catch (error) {
            console.error(error);
            alert("Failed to delete from Supabase");
        }
    };

    const handleSubmitCoupon = async () => {
        setIsSaving(true);
        const limit = parseInt(couponForm.usageLimit);
        if (!limit || limit < 1) {
            alert("Usage limit is required and must be at least 1.");
            setIsSaving(false);
            return;
        }

        // BOGO & B2G1 Validation
        if ((couponForm.type === 'BOGO' || couponForm.type === 'B2G1') && (!couponForm.restaurantId || !couponForm.itemId)) {
            alert("Restaurant and Item are required for Buy X Get Y offers.");
            setIsSaving(false);
            return;
        }

        const id = editingId || couponForm.code.toUpperCase();
        const payload = {
            id,
            code: couponForm.code.toUpperCase(),
            type: couponForm.type,
            value: (couponForm.type === 'BOGO' || couponForm.type === 'B2G1') ? 0 : (couponForm.value || 0),
            minOrder: couponForm.minOrder || 0,
            description: couponForm.description,
            isVisible: couponForm.isVisible,
            isActive: couponForm.isActive !== false,
            usageLimit: limit,
            usedCount: editingId ? (couponForm.usedCount || 0) : 0,
            restaurantId: couponForm.restaurantId || null,
            itemId: couponForm.itemId || null
        };

        try {
            console.log("Submitting coupon payload:", payload);
            const idToken = await user.getIdToken();
            const { error } = await supabase.functions.invoke("manage-coupons", {
                body: { action: editingId ? "UPDATE" : "CREATE", payload },
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (error) throw error;
            await fetchData();
            setActiveTab("list");
        } catch (error) {
            console.error(error);
            alert("Failed to save to Supabase");
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className="animate-in fade-in duration-500">
            {activeTab === "list" && (
                <div className="flex justify-end mb-8">
                    <button
                        onClick={handleAddNewCoupon}
                        className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-orange-900/40 hover:bg-orange-500 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} /> Create Promo Code
                    </button>
                </div>
            )}

            {activeTab === "list" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map(c => (
                        <div
                            key={c.id}
                            onClick={() => handleEditCoupon(c)}
                            className="bg-white/5 p-8 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all relative group hover:shadow-xl cursor-pointer"
                        >
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={(e) => handleToggleActive(e, c)}
                                    className={`p-2 rounded-full transition-colors ${c.isActive !== false ? 'bg-green-500/20 text-green-400 hover:bg-green-500/40' : 'bg-red-500/20 text-red-400 hover:bg-red-500/40'}`}
                                    title={c.isActive !== false ? "Active (Click to Deactivate)" : "Inactive (Click to Activate)"}
                                >
                                    {c.isActive !== false ? <Check size={16} /> : <X size={16} />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCoupon(c.id); }}
                                    className="bg-red-500/10 text-red-500 p-2 rounded-full hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash size={16} />
                                </button>
                            </div>

                            <div className="flex justify-between items-start mb-6">
                                <div className="bg-orange-500/20 text-orange-400 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border border-orange-500/30">{c.type}</div>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">{c.code}</h3>
                            <p className="text-gray-400 text-sm mb-6 font-medium">{c.description}</p>

                            <div className="flex items-center justify-between text-sm font-bold text-gray-300 bg-black/30 p-4 rounded-xl border border-white/5">
                                <span>Value: {c.type === 'FLAT' ? `₹${c.value}` : `${c.value}%`}</span>
                                <span>Min: ₹{c.minOrder}</span>
                                {c.usageLimit > 0 && (
                                    <span className={`${(c.usedCount || 0) >= c.usageLimit ? 'text-red-400' : 'text-cyan-400'}`}>
                                        Used: {c.usedCount || 0}/{c.usageLimit}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-2xl mx-auto shadow-2xl relative pb-24">
                    <h2 className="text-3xl font-black mb-10 text-white border-b border-white/10 pb-6">{editingId ? "Edit Promo Code" : "Create New Promo Code"}</h2>

                    <div className="space-y-8">
                        <FormInput label="Coupon Code" value={couponForm.code} onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME50" />

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Discount Type</label>
                                <div className="relative">
                                    <select className="appearance-none p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium" value={couponForm.type} onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}>
                                        <option value="FLAT" className="bg-gray-900">Flat Amount (₹)</option>
                                        <option value="PERCENTAGE" className="bg-gray-900">Percentage (%)</option>
                                        <option value="BOGO" className="bg-gray-900">Buy 1 Get 1 (BOGO)</option>
                                        <option value="B2G1" className="bg-gray-900">Buy 2 Get 1 Free</option>
                                    </select>
                                </div>
                            </div>
                            {!['BOGO', 'B2G1'].includes(couponForm.type) ? (
                                <FormInput label="Discount Value" type="number" value={couponForm.value} onChange={(e) => setCouponForm({ ...couponForm, value: e.target.value })} placeholder="50" />
                            ) : (
                                <div className="space-y-3 opacity-50">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Discount Value</label>
                                    <div className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white/40 font-medium text-sm italic">
                                        Calculated Automatically
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Item-Specific Configuration */}
                        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <Utensils size={18} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Target Item (Optional)</h3>
                            </div>
                            <p className="text-gray-400 text-sm pl-13">Link this coupon to a specific item. {couponForm.type === 'BOGO' ? <span className="text-orange-400 font-bold">REQUIRED for BOGO.</span> : "Leave blank for a global discount."}</p>

                            <div className="space-y-6 pl-13">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Step 1: Select Restaurant</label>
                                    <select
                                        className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                        value={couponForm.restaurantId || ""}
                                        onChange={(e) => {
                                            setCouponForm({ ...couponForm, restaurantId: e.target.value, itemId: null });
                                            setCouponTargetType("item");
                                            setItemSearchQuery("");
                                        }}
                                    >
                                        <option value="" className="bg-gray-900">All Restaurants (Global Coupon)</option>
                                        {restaurants.map(r => (
                                            <option key={r.id} value={r.id} className="bg-gray-900">{r.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {couponForm.restaurantId && (
                                    <div className="space-y-6 pt-4 border-t border-white/5">
                                        <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 gap-2">
                                            <button
                                                onClick={() => { setCouponTargetType("item"); setCouponForm({ ...couponForm, itemId: null }); }}
                                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${couponTargetType === 'item' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                Specific Item
                                            </button>
                                            <button
                                                onClick={() => { setCouponTargetType("category"); setCouponForm({ ...couponForm, itemId: null }); }}
                                                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${couponTargetType === 'category' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                                            >
                                                Entire Category
                                            </button>
                                        </div>

                                        {couponTargetType === "item" ? (
                                            <div className="space-y-4">
                                                <div className="relative group">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search item name..."
                                                        value={itemSearchQuery}
                                                        onChange={(e) => setItemSearchQuery(e.target.value)}
                                                        className="w-full bg-black/20 border border-white/10 pl-11 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {(() => {
                                                        const menu = (restaurants.find(r => r.id === couponForm.restaurantId)?.menu || []);
                                                        if (!itemSearchQuery) return menu;

                                                        const query = itemSearchQuery.toLowerCase().trim();
                                                        const fuse = new Fuse(menu, {
                                                            keys: ['name'],
                                                            threshold: 0.3,
                                                            includeScore: true
                                                        });
                                                        const results = fuse.search(itemSearchQuery);

                                                        // Boost scores for exact matches
                                                        const scoredResults = results.map(result => {
                                                            const itemName = result.item.name.toLowerCase();
                                                            let adjustedScore = result.score;
                                                            if (itemName === query) adjustedScore -= 0.5;
                                                            else if (itemName.startsWith(query)) adjustedScore -= 0.3;
                                                            else if (itemName.includes(query)) adjustedScore -= 0.2;
                                                            return { item: result.item, score: adjustedScore };
                                                        });

                                                        // Include substring matches
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
                                                    })().map(item => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => setCouponForm({ ...couponForm, itemId: item.id })}
                                                            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${couponForm.itemId === item.id ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                                        >
                                                            <span className="font-bold text-sm tracking-tight">{item.name}</span>
                                                            <span className="text-xs font-medium opacity-60">₹{item.price}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {Array.from(new Set(restaurants.find(r => r.id === couponForm.restaurantId)?.menu?.map(i => i.category) || []))
                                                    .map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => setCouponForm({ ...couponForm, itemId: `CATEGORY:${cat}` })}
                                                            className={`p-4 rounded-xl border transition-all text-center font-bold text-xs ${couponForm.itemId === `CATEGORY:${cat}` ? 'bg-orange-600/20 border-orange-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                                        >
                                                            {cat || "General"}
                                                        </button>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <FormInput label="Min Order Amount (₹)" type="number" value={couponForm.minOrder} onChange={(e) => setCouponForm({ ...couponForm, minOrder: e.target.value })} placeholder="0" />

                        <FormInput label="Usage Limit" type="number" value={couponForm.usageLimit} onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })} placeholder="e.g. 100" />

                        <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
                            <textarea placeholder="Brief description of the offer..." className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium h-32 resize-none" value={couponForm.description} onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })} />
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input
                                    type="checkbox"
                                    name="toggle"
                                    id="toggle"
                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                                    checked={couponForm.isVisible !== false}
                                    onChange={(e) => setCouponForm({ ...couponForm, isVisible: e.target.checked })}
                                    style={{ right: couponForm.isVisible !== false ? '0' : 'auto', left: couponForm.isVisible !== false ? 'auto' : '0' }}
                                />
                                <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${couponForm.isVisible !== false ? 'bg-orange-500' : 'bg-gray-600'}`}></label>
                            </div>
                            <label htmlFor="toggle" className="text-sm font-bold text-white cursor-pointer select-none">
                                Show in Cart Quick Apply?
                            </label>
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 p-5 rounded-2xl border border-white/5">
                            <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                <input
                                    type="checkbox"
                                    name="toggle-active"
                                    id="toggle-active"
                                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white appearance-none cursor-pointer"
                                    checked={couponForm.isActive !== false}
                                    onChange={(e) => setCouponForm({ ...couponForm, isActive: e.target.checked })}
                                    style={{ right: couponForm.isActive !== false ? '0' : 'auto', left: couponForm.isActive !== false ? 'auto' : '0' }}
                                />
                                <label htmlFor="toggle-active" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${couponForm.isActive !== false ? 'bg-green-500' : 'bg-gray-600'}`}></label>
                            </div>
                            <label htmlFor="toggle-active" className="text-sm font-bold text-white cursor-pointer select-none">
                                Coupon Active? <span className="text-gray-500 font-normal">(If off, customers cannot apply)</span>
                            </label>
                        </div>
                    </div>
                    {/* Floating Action Bar */}
                    <StickyActionBar
                        onSave={handleSubmitCoupon}
                        onCancel={() => setActiveTab("list")}
                        isSaving={isSaving}
                    />
                </div>
            )}
        </div>
    );
}
