import { Timer, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { format12h } from "@/lib/formatters";
import ConfirmModal from "../../components/ConfirmModal";

export default function PreOrderSlotEditor({
    isEnabled,
    onToggleEnabled,
    slots,
    onSlotsChange,
    label,
    emptyText = "No pre-order slots defined.",
    accent = "cyan",
}) {
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        slotIdx: null,
        slotName: "",
    });

    const addSlot = () =>
        onSlotsChange([...(slots || []), { start: "", end: "", cutoffMinutes: 30 }]);
    const updateSlot = (index, field, value) => {
        const newSlots = [...(slots || [])];
        newSlots[index] = { ...newSlots[index], [field]: value };
        onSlotsChange(newSlots);
    };
    const removeSlot = (index) => onSlotsChange((slots || []).filter((_, i) => i !== index));

    return (
        <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div
                        className={`w-10 h-10 rounded-full bg-${accent}-500/10 flex items-center justify-center text-${accent}-400 border border-${accent}-500/20`}
                    >
                        <Timer size={18} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">{label}</h3>
                        <p className="text-gray-400 text-sm">
                            Customers must pick one of these slots to check out — cutoff is minutes
                            before the slot starts after which it&apos;s no longer bookable.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => onToggleEnabled(!isEnabled)}
                    className={`relative w-14 h-8 rounded-full transition-all border flex-shrink-0 ${isEnabled ? `bg-${accent}-500/80 border-${accent}-400` : "bg-white/10 border-white/20"}`}
                >
                    <span
                        className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${isEnabled ? "left-7" : "left-1"}`}
                    />
                </button>
            </div>

            {isEnabled && (
                <div className="space-y-4 pt-2">
                    <div className="flex justify-end">
                        <button
                            onClick={addSlot}
                            className={`bg-${accent}-600/20 text-${accent}-400 hover:bg-${accent}-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-${accent}-500/20 flex items-center gap-2`}
                        >
                            <Plus size={14} /> Add Slot
                        </button>
                    </div>

                    {(slots || []).map((slot, index) => (
                        <div
                            key={index}
                            className="flex flex-col md:flex-row gap-4 items-start md:items-end"
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
                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold [color-scheme:dark]"
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
                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold [color-scheme:dark]"
                                    value={slot.end}
                                    onChange={(e) => updateSlot(index, "end", e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-36 space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1 block">
                                    Cutoff (mins)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-cyan-500/50 transition-all font-bold"
                                    value={slot.cutoffMinutes ?? 30}
                                    onChange={(e) =>
                                        updateSlot(
                                            index,
                                            "cutoffMinutes",
                                            Math.max(0, Number(e.target.value) || 0)
                                        )
                                    }
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
                        <div className="text-gray-500 italic text-sm">{emptyText}</div>
                    )}
                </div>
            )}

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
