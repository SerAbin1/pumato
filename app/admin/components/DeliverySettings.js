import { useState } from 'react';
import { Clock, Plus, Trash, Search, X } from "lucide-react";
import FormInput from './FormInput';
import { format12h } from "@/lib/formatters";

const DEFAULT_CAMPUS_CONFIG = [
    { id: "MN", name: "Main Campus", deliveryCharge: 30 },
    { id: "S1", name: "South Campus", deliveryCharge: 30 }
];

import ServiceOverrideControl from './ServiceOverrideControl';

export default function DeliverySettings({
    orderSettings,
    setOrderSettings,
    restaurants
}) {
    const [lightItemSearchQuery, setLightItemSearchQuery] = useState("");
    const [heavyItemSearchQuery, setHeavyItemSearchQuery] = useState("");

    return (
        <div className="space-y-8">
            <ServiceOverrideControl
                serviceName="Food Delivery"
                settings={orderSettings}
                onUpdate={(updates) => setOrderSettings({ ...orderSettings, ...updates })}
            />
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
                <h2 className="text-3xl font-black text-white mb-8">Delivery Settings</h2>

                <div className="max-w-2xl space-y-8">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                                    <Clock size={18} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Food Ordering Hours</h3>
                            </div>
                            <button
                                onClick={() => setOrderSettings({ ...orderSettings, slots: [...(orderSettings.slots || []), { start: "18:30", end: "23:00" }] })}
                                className="bg-orange-600/20 text-orange-400 hover:bg-orange-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-orange-500/20 flex items-center gap-2"
                            >
                                <Plus size={14} /> Add Slot
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm pl-13">Define one or more time windows when customers can place food delivery orders.</p>

                        <div className="space-y-4 pt-2">
                            {(orderSettings.slots || []).map((slot, index) => (
                                <div key={index} className="pl-13 flex flex-col md:flex-row gap-4 items-start md:items-end">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Start Time</label>
                                            <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">{format12h(slot.start)}</span>
                                        </div>
                                        <input
                                            type="time"
                                            className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-bold [color-scheme:dark]"
                                            value={slot.start}
                                            onChange={(e) => {
                                                const newSlots = [...orderSettings.slots];
                                                newSlots[index].start = e.target.value;
                                                setOrderSettings({ ...orderSettings, slots: newSlots });
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">End Time</label>
                                            <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">{format12h(slot.end)}</span>
                                        </div>
                                        <input
                                            type="time"
                                            className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-orange-500/50 transition-all font-bold [color-scheme:dark]"
                                            value={slot.end}
                                            onChange={(e) => {
                                                const newSlots = [...orderSettings.slots];
                                                newSlots[index].end = e.target.value;
                                                setOrderSettings({ ...orderSettings, slots: newSlots });
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={() => setOrderSettings({ ...orderSettings, slots: orderSettings.slots.filter((_, i) => i !== index) })}
                                        className="p-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all flex-shrink-0"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            ))}

                            <div className="pl-13 col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/5 p-6 rounded-2xl border border-white/5">
                                <FormInput
                                    label="Global Base Del. Charge (₹)"
                                    type="number"
                                    value={orderSettings.baseDeliveryCharge || "30"}
                                    onChange={(e) => setOrderSettings({ ...orderSettings, baseDeliveryCharge: e.target.value })}
                                />
                                <FormInput
                                    label="Global Extra Threshold"
                                    type="number"
                                    value={orderSettings.extraItemThreshold || "3"}
                                    onChange={(e) => setOrderSettings({ ...orderSettings, extraItemThreshold: e.target.value })}
                                />
                                <FormInput
                                    label="Global Extra Charge (₹)"
                                    type="number"
                                    value={orderSettings.extraItemCharge || "10"}
                                    onChange={(e) => setOrderSettings({ ...orderSettings, extraItemCharge: e.target.value })}
                                />
                            </div>

                            {/* Delivery Campus Charges */}
                            <div className="pl-13 bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                <div>
                                    <h4 className="font-bold text-white text-sm">Campus Delivery Charges</h4>
                                    <p className="text-xs text-gray-500">Extra charge per campus added on top of the base delivery charge.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG).map((campus, idx) => (
                                        <div key={campus.id} className="bg-black/20 p-4 rounded-xl border border-white/5">
                                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">{campus.name} (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={campus.deliveryCharge}
                                                onChange={(e) => {
                                                    const config = [...(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG)];
                                                    config[idx] = { ...config[idx], deliveryCharge: Math.max(0, Number(e.target.value)) };
                                                    setOrderSettings({ ...orderSettings, deliveryCampusConfig: config });
                                                }}
                                                className="w-full bg-black/30 p-3 rounded-xl text-white font-bold border border-white/10 focus:border-purple-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Light Items Section */}
                            <div className="pl-13 bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Light Items</h4>
                                        <p className="text-xs text-gray-500">Items that bundle before counting towards extra delivery charge.</p>
                                    </div>
                                    <div className="w-32">
                                        <FormInput
                                            label="Bundle Size"
                                            type="number"
                                            value={orderSettings.lightItemThreshold || "5"}
                                            onChange={(e) => setOrderSettings({ ...orderSettings, lightItemThreshold: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Selected Light Items */}
                                <div className="flex flex-wrap gap-2">
                                    {(orderSettings.lightItems || []).map(itemId => {
                                        const allItems = restaurants.flatMap(r => (r.menu || []).map(m => ({ ...m, restaurantName: r.name })));
                                        const item = allItems.find(i => i.id === itemId);
                                        return item ? (
                                            <span key={itemId} className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-orange-500/20">
                                                {item.name} <span className="text-gray-500 text-[10px]">({item.restaurantName})</span>
                                                <button
                                                    onClick={() => setOrderSettings({
                                                        ...orderSettings,
                                                        lightItems: (orderSettings.lightItems || []).filter(id => id !== itemId)
                                                    })}
                                                    className="hover:text-red-400"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                    {(orderSettings.lightItems || []).length === 0 && (
                                        <span className="text-gray-500 text-xs italic">No light items selected</span>
                                    )}
                                </div>

                                {/* Add Light Item Search */}
                                <div className="relative">
                                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus-within:border-orange-500/50">
                                        <Search size={16} className="text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search items to add..."
                                            value={lightItemSearchQuery}
                                            onChange={(e) => setLightItemSearchQuery(e.target.value)}
                                            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500"
                                        />
                                        {lightItemSearchQuery && (
                                            <button onClick={() => setLightItemSearchQuery("")} className="text-gray-500 hover:text-white">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {lightItemSearchQuery.trim().length > 0 && (
                                        <div className="absolute z-20 left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                                            {restaurants.flatMap(r =>
                                                (r.menu || [])
                                                    .filter(item =>
                                                        item.name.toLowerCase().includes(lightItemSearchQuery.toLowerCase()) &&
                                                        !(orderSettings.lightItems || []).includes(item.id)
                                                    )
                                                    .map(item => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => {
                                                                setOrderSettings({
                                                                    ...orderSettings,
                                                                    lightItems: [...(orderSettings.lightItems || []), item.id]
                                                                });
                                                                setLightItemSearchQuery("");
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-white flex justify-between items-center"
                                                        >
                                                            <span>{item.name}</span>
                                                            <span className="text-gray-500 text-xs">{r.name}</span>
                                                        </button>
                                                    ))
                                            )}
                                            {restaurants.flatMap(r => (r.menu || []).filter(item =>
                                                item.name.toLowerCase().includes(lightItemSearchQuery.toLowerCase()) &&
                                                !(orderSettings.lightItems || []).includes(item.id)
                                            )).length === 0 && (
                                                    <div className="px-4 py-3 text-gray-500 text-sm text-center">No matching items</div>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Heavy Items Section */}
                            <div className="pl-13 bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Heavy Items</h4>
                                        <p className="text-xs text-gray-500">Items that add a higher per-item surcharge instead of the regular extra charge.</p>
                                    </div>
                                    <div className="w-32">
                                        <FormInput
                                            label="Charge (₹)"
                                            type="number"
                                            value={orderSettings.heavyItemCharge || "30"}
                                            onChange={(e) => setOrderSettings({ ...orderSettings, heavyItemCharge: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Selected Heavy Items */}
                                <div className="flex flex-wrap gap-2">
                                    {(orderSettings.heavyItems || []).map(itemId => {
                                        const allItems = restaurants.flatMap(r => (r.menu || []).map(m => ({ ...m, restaurantName: r.name })));
                                        const item = allItems.find(i => i.id === itemId);
                                        return item ? (
                                            <span key={itemId} className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-red-500/20">
                                                {item.name} <span className="text-gray-500 text-[10px]">({item.restaurantName})</span>
                                                <button
                                                    onClick={() => setOrderSettings({
                                                        ...orderSettings,
                                                        heavyItems: (orderSettings.heavyItems || []).filter(id => id !== itemId)
                                                    })}
                                                    className="hover:text-red-400"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ) : null;
                                    })}
                                    {(orderSettings.heavyItems || []).length === 0 && (
                                        <span className="text-gray-500 text-xs italic">No heavy items selected</span>
                                    )}
                                </div>

                                {/* Add Heavy Item Search */}
                                <div className="relative">
                                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus-within:border-red-500/50">
                                        <Search size={16} className="text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search items to add..."
                                            value={heavyItemSearchQuery}
                                            onChange={(e) => setHeavyItemSearchQuery(e.target.value)}
                                            className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500"
                                        />
                                        {heavyItemSearchQuery && (
                                            <button onClick={() => setHeavyItemSearchQuery("")} className="text-gray-500 hover:text-white">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {heavyItemSearchQuery.trim().length > 0 && (
                                        <div className="absolute z-20 left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                                            {restaurants.flatMap(r =>
                                                (r.menu || [])
                                                    .filter(item =>
                                                        item.name.toLowerCase().includes(heavyItemSearchQuery.toLowerCase()) &&
                                                        !(orderSettings.heavyItems || []).includes(item.id) &&
                                                        !(orderSettings.lightItems || []).includes(item.id)
                                                    )
                                                    .map(item => (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => {
                                                                setOrderSettings({
                                                                    ...orderSettings,
                                                                    heavyItems: [...(orderSettings.heavyItems || []), item.id]
                                                                });
                                                                setHeavyItemSearchQuery("");
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-white/10 text-sm text-white flex justify-between items-center"
                                                        >
                                                            <span>{item.name}</span>
                                                            <span className="text-gray-500 text-xs">{r.name}</span>
                                                        </button>
                                                    ))
                                            )}
                                            {restaurants.flatMap(r => (r.menu || []).filter(item =>
                                                item.name.toLowerCase().includes(heavyItemSearchQuery.toLowerCase()) &&
                                                !(orderSettings.heavyItems || []).includes(item.id) &&
                                                !(orderSettings.lightItems || []).includes(item.id)
                                            )).length === 0 && (
                                                    <div className="px-4 py-3 text-gray-500 text-sm text-center">No matching items</div>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(orderSettings.slots || []).length === 0 && (
                                <div className="pl-13 text-gray-500 italic text-sm">No ordering slots defined. Service will remain offline.</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
