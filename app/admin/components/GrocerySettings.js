import { Tag, Clock, Plus, Trash, Timer } from "lucide-react";
import { format12h } from "@/lib/formatters";

import ServiceOverrideControl from "./ServiceOverrideControl";
import { useState } from "react";
import ConfirmModal from "../../components/ConfirmModal";

function SlotEditor({ slots, onSlotsChange, label, emptyText, accent = "green" }) {
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        slotIdx: null,
        slotName: "",
    });

    const addSlot = () => onSlotsChange([...(slots || []), { start: "", end: "" }]);
    const updateSlot = (index, field, value) => {
        const newSlots = [...(slots || [])];
        newSlots[index] = { ...newSlots[index], [field]: value };
        onSlotsChange(newSlots);
    };
    const removeSlot = (index) => onSlotsChange((slots || []).filter((_, i) => i !== index));

    return (
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-full bg-${accent}-500/10 flex items-center justify-center text-${accent}-400 border border-${accent}-500/20`}
                    >
                        <div className="relative">
                            <Clock size={16} className="absolute -left-1 -top-1 opacity-50" />
                            <Tag size={18} className="relative z-10" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white">{label}</h3>
                </div>
                <button
                    onClick={addSlot}
                    className={`bg-${accent}-600/20 text-${accent}-400 hover:bg-${accent}-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-${accent}-500/20 flex items-center gap-2`}
                >
                    <Plus size={14} /> Add Slot
                </button>
            </div>
            <p className="text-gray-400 text-sm pl-13">
                {label === "Grocery Service Hours"
                    ? "Define time windows when the Grocery service is active (live)."
                    : "Define delivery windows customers can schedule pre-orders into when the service is offline."}
            </p>

            <div className="space-y-4 pt-2">
                {(slots || []).map((slot, index) => (
                    <div
                        key={index}
                        className="pl-13 flex flex-col md:flex-row gap-4 items-start md:items-end"
                    >
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Start Time
                                </label>
                                <span
                                    className={`text-[10px] font-bold text-${accent}-400 bg-${accent}-500/10 px-2 py-0.5 rounded-full border border-${accent}-500/20`}
                                >
                                    {format12h(slot.start)}
                                </span>
                            </div>
                            <input
                                type="time"
                                className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-green-500/50 transition-all font-bold [color-scheme:dark]"
                                value={slot.start}
                                onChange={(e) => updateSlot(index, "start", e.target.value)}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    End Time
                                </label>
                                <span
                                    className={`text-[10px] font-bold text-${accent}-400 bg-${accent}-500/10 px-2 py-0.5 rounded-full border border-${accent}-500/20`}
                                >
                                    {format12h(slot.end)}
                                </span>
                            </div>
                            <input
                                type="time"
                                className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-green-500/50 transition-all font-bold [color-scheme:dark]"
                                value={slot.end}
                                onChange={(e) => updateSlot(index, "end", e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => {
                                const slotName = `${format12h(slot.start)} - ${format12h(slot.end)}`;
                                setConfirmModal({ isOpen: true, slotIdx: index, slotName });
                            }}
                            className="p-4 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all flex-shrink-0"
                        >
                            <Trash size={18} />
                        </button>
                    </div>
                ))}
                {(slots || []).length === 0 && (
                    <div className="pl-13 text-gray-500 italic text-sm">{emptyText}</div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => removeSlot(confirmModal.slotIdx)}
                title="Delete Timeslot?"
                message={`Are you sure you want to delete the timeslot "${confirmModal.slotName}"?`}
                confirmLabel="Delete"
            />
        </div>
    );
}

export default function GrocerySettings({ grocerySettings, setGrocerySettings }) {
    return (
        <div className="space-y-8">
            <ServiceOverrideControl
                serviceName="Grocery"
                settings={grocerySettings}
                onUpdate={(updates) => setGrocerySettings({ ...grocerySettings, ...updates })}
            />

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                <h2 className="text-3xl font-black text-white mb-8">Grocery Settings</h2>

                <div className="max-w-2xl space-y-8">
                    <SlotEditor
                        slots={grocerySettings.service_hours}
                        onSlotsChange={(service_hours) =>
                            setGrocerySettings({ ...grocerySettings, service_hours })
                        }
                        label="Grocery Service Hours"
                        emptyText="No service hours defined. Service will remain offline."
                    />

                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                                    <Timer size={18} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">
                                        Scheduled Pre-orders (when Offline)
                                    </h3>
                                    <p className="text-gray-400 text-sm">
                                        Allow customers to schedule a delivery slot while the
                                        service is offline.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setGrocerySettings({
                                        ...grocerySettings,
                                        isDeliverySlotEnabled:
                                            !grocerySettings.isDeliverySlotEnabled,
                                    })
                                }
                                className={`relative w-14 h-8 rounded-full transition-all border flex-shrink-0 ${grocerySettings.isDeliverySlotEnabled ? "bg-cyan-500/80 border-cyan-400" : "bg-white/10 border-white/20"}`}
                            >
                                <span
                                    className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${grocerySettings.isDeliverySlotEnabled ? "left-7" : "left-1"}`}
                                />
                            </button>
                        </div>
                    </div>

                    {grocerySettings.isDeliverySlotEnabled && (
                        <SlotEditor
                            slots={grocerySettings.delivery_hours}
                            onSlotsChange={(delivery_hours) =>
                                setGrocerySettings({ ...grocerySettings, delivery_hours })
                            }
                            label="Delivery Hours (Pre-order Slots)"
                            emptyText="No delivery hours defined. Add windows customers can schedule into."
                            accent="cyan"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
