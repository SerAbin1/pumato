import { useState } from "react";
import { Clock, Plus, Trash, Search, X } from "lucide-react";
import FormInput from "./FormInput";
import ServiceOverrideControl from './ServiceOverrideControl';
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import { format12h } from "@/lib/utils";
import ConfirmModal from "../../components/ConfirmModal";

export default function DeliverySettings({
    orderSettings,
    setOrderSettings,
    restaurants
}) {
    const [lightItemSearchQuery, setLightItemSearchQuery] = useState("");
    const [heavyItemSearchQuery, setHeavyItemSearchQuery] = useState("");
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, targetId: null, targetName: "", context: null });

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
                    <div className="space-y-12">
                        {/* Unified Ordering Hours & Charges */}
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500"></div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20 shadow-lg shadow-orange-500/5">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white">Food Ordering Hours</h3>
                                    <p className="text-sm text-gray-500">Manage ordering slots and delivery charges for each campus.</p>
                                </div>
                            </div>

                            <div className="space-y-10">
                                {(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG).map((campus, idx) => {
                                    const slots = campus.slots || [];

                                    return (
                                        <div key={campus.id} className="space-y-6 pb-10 border-b border-white/5 last:border-0 last:pb-0">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                                                        <h4 className="text-xl font-black text-white uppercase tracking-wider">{campus.name}</h4>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-white/10 hover:border-orange-500/30 transition-all">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">Charge</label>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-orange-500/50 font-black text-xs">₹</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={campus.deliveryCharge}
                                                                onChange={(e) => {
                                                                    const config = [...(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG)];
                                                                    config[idx] = { ...config[idx], deliveryCharge: Math.max(0, Number(e.target.value)) };
                                                                    setOrderSettings({ ...orderSettings, deliveryCampusConfig: config });
                                                                }}
                                                                className="w-16 bg-transparent text-sm text-orange-400 font-black outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:text-white transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const config = [...(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG)];
                                                        config[idx] = {
                                                            ...config[idx],
                                                            slots: [...slots, { start: "18:30", end: "23:00" }]
                                                        };
                                                        setOrderSettings({ ...orderSettings, deliveryCampusConfig: config });
                                                    }}
                                                    className="self-start md:self-auto bg-orange-600/10 text-orange-500 hover:bg-orange-600 hover:text-white px-6 py-3 rounded-2xl text-xs font-black transition-all border border-orange-500/20 flex items-center gap-2 active:scale-95 shadow-lg shadow-orange-500/5"
                                                >
                                                    <Plus size={18} /> Add Slot
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {slots.map((slot, sIdx) => (
                                                    <div key={sIdx} className="group relative flex items-center gap-4 p-5 bg-black/40 border border-white/5 rounded-[1.5rem] hover:border-orange-500/40 transition-all hover:bg-black/60 shadow-inner">
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex justify-between items-center px-1">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Start</label>
                                                                <span className="text-[9px] font-black text-orange-500/50">{format12h(slot.start)}</span>
                                                            </div>
                                                            <input
                                                                type="time"
                                                                className="w-full bg-transparent text-sm text-white font-black focus:outline-none [color-scheme:dark]"
                                                                value={slot.start}
                                                                onChange={(e) => {
                                                                    const config = [...(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG)];
                                                                    const newSlots = [...slots];
                                                                    newSlots[sIdx] = { ...newSlots[sIdx], start: e.target.value };
                                                                    config[idx] = { ...config[idx], slots: newSlots };
                                                                    setOrderSettings({ ...orderSettings, deliveryCampusConfig: config });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="w-[1px] h-10 bg-white/10" />
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex justify-between items-center px-1">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">End</label>
                                                                <span className="text-[9px] font-black text-orange-500/50">{format12h(slot.end)}</span>
                                                            </div>
                                                            <input
                                                                type="time"
                                                                className="w-full bg-transparent text-sm text-white font-black focus:outline-none [color-scheme:dark]"
                                                                value={slot.end}
                                                                onChange={(e) => {
                                                                    const config = [...(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG)];
                                                                    const newSlots = [...slots];
                                                                    newSlots[sIdx] = { ...newSlots[sIdx], end: e.target.value };
                                                                    config[idx] = { ...config[idx], slots: newSlots };
                                                                    setOrderSettings({ ...orderSettings, deliveryCampusConfig: config });
                                                                }}
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setConfirmModal({
                                                                    isOpen: true,
                                                                    type: "slot",
                                                                    targetId: sIdx,
                                                                    targetName: `${format12h(slot.start)} - ${format12h(slot.end)}`,
                                                                    context: idx
                                                                });
                                                            }}
                                                            className="p-3 text-gray-500 hover:text-red-500 transition-colors bg-white/5 rounded-xl hover:bg-red-500/10"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {slots.length === 0 && (
                                                    <div className="md:col-span-2 lg:col-span-3 py-10 bg-black/20 border border-dashed border-white/10 rounded-[1.5rem] flex flex-col items-center justify-center grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100">
                                                        <Clock size={24} className="text-gray-500 mb-3" />
                                                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">No hours scheduled for {campus.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                            <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black">₹</span>
                                Order Thresholds
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                                <FormInput
                                    label="Base Charge"
                                    type="number"
                                    value={orderSettings.baseDeliveryCharge || "30"}
                                    onChange={(e) => setOrderSettings({ ...orderSettings, baseDeliveryCharge: e.target.value })}
                                />
                                <FormInput
                                    label="Extra Threshold"
                                    type="number"
                                    value={orderSettings.extraItemThreshold || "3"}
                                    onChange={(e) => setOrderSettings({ ...orderSettings, extraItemThreshold: e.target.value })}
                                />
                                <FormInput
                                    label="Extra Charge"
                                    type="number"
                                    value={orderSettings.extraItemCharge || "10"}
                                    onChange={(e) => setOrderSettings({ ...orderSettings, extraItemCharge: e.target.value })}
                                />
                                <FormInput
                                    label="Min Order"
                                    type="number"
                                    value={orderSettings.minOrderAmount || "0"}
                                    onChange={(e) => setOrderSettings({ ...orderSettings, minOrderAmount: e.target.value })}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Light Items Section */}
                <div className="mt-12 space-y-6">
                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Clock size={20} className="text-orange-400" />
                                    Light Items
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">Items that bundle before counting towards extra delivery charge.</p>
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

                        <div className="flex flex-wrap gap-2">
                            {(orderSettings.lightItems || []).map(itemId => {
                                const allItems = restaurants.flatMap(r => (r.menu || []).map(m => ({ ...m, restaurantName: r.name })));
                                const item = allItems.find(i => i.id === itemId);
                                return item ? (
                                    <span key={itemId} className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-orange-500/20">
                                        {item.name} <span className="text-gray-500 text-[10px]">({item.restaurantName})</span>
                                        <button
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    type: "lightItem",
                                                    targetId: itemId,
                                                    targetName: item.name
                                                });
                                            }}
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

                    <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Clock size={20} className="text-red-400" />
                                    Heavy Items
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">Items that add a higher surcharge.</p>
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

                        <div className="flex flex-wrap gap-2">
                            {(orderSettings.heavyItems || []).map(itemId => {
                                const allItems = restaurants.flatMap(r => (r.menu || []).map(m => ({ ...m, restaurantName: r.name })));
                                const item = allItems.find(i => i.id === itemId);
                                return item ? (
                                    <span key={itemId} className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-red-500/20">
                                        {item.name} <span className="text-gray-500 text-[10px]">({item.restaurantName})</span>
                                        <button
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    type: "heavyItem",
                                                    targetId: itemId,
                                                    targetName: item.name
                                                });
                                            }}
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
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => {
                    if (confirmModal.type === "slot") {
                        const idx = confirmModal.context;
                        const sIdx = confirmModal.targetId;
                        const config = [...(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG)];
                        config[idx] = {
                            ...config[idx],
                            slots: (config[idx].slots || []).filter((_, i) => i !== sIdx)
                        };
                        setOrderSettings({ ...orderSettings, deliveryCampusConfig: config });
                    } else if (confirmModal.type === "lightItem") {
                        setOrderSettings({
                            ...orderSettings,
                            lightItems: (orderSettings.lightItems || []).filter(id => id !== confirmModal.targetId)
                        });
                    } else if (confirmModal.type === "heavyItem") {
                        setOrderSettings({
                            ...orderSettings,
                            heavyItems: (orderSettings.heavyItems || []).filter(id => id !== confirmModal.targetId)
                        });
                    }
                }}
                title={confirmModal.type === "slot" ? "Delete Timeslot?" : "Remove Item?"}
                message={`Are you sure you want to ${confirmModal.type === "slot" ? 'delete' : 'remove'} "${confirmModal.targetName}"?`}
                confirmLabel={confirmModal.type === "slot" ? "Delete" : "Remove"}
            />
        </div>
    );
}
