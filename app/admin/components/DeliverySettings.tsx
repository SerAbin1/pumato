import { useState } from "react";
import { Clock, Plus, Trash } from "lucide-react";
import FormInput from "./FormInput";
import ServiceOverrideControl from "./ServiceOverrideControl";
import PreOrderSlotEditor from "./PreOrderSlotEditor";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import { format12h } from "@/lib/formatters";
import ConfirmModal from "../../components/ConfirmModal";
import type { CampusDeliveryDraft, OrderSettingsDraft, SetDraft } from "../types";

interface DeliverySettingsProps {
    orderSettings: OrderSettingsDraft;
    setOrderSettings: SetDraft<OrderSettingsDraft>;
    settingsLoaded: boolean;
}

export default function DeliverySettings({
    orderSettings,
    setOrderSettings,
    settingsLoaded,
}: DeliverySettingsProps) {
    // Only slot deletion is confirmed: targetId is the slot index, context the campus index.
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: "slot" | null;
        targetId: number | null;
        targetName: string;
        context: number | null;
    }>({
        isOpen: false,
        type: null,
        targetId: null,
        targetName: "",
        context: null,
    });

    return (
        <div className={`space-y-8 ${!settingsLoaded ? "opacity-50 pointer-events-none" : ""}`}>
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
                                    <h3 className="text-2xl font-black text-white">
                                        Food Ordering Hours
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Manage ordering slots and delivery charges for each campus.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-10">
                                {(
                                    (orderSettings.deliveryCampusConfig ||
                                        DEFAULT_CAMPUS_CONFIG) as CampusDeliveryDraft[]
                                ).map((campus, idx) => {
                                    const slots = campus.slots || [];

                                    return (
                                        <div
                                            key={campus.id}
                                            className="space-y-6 pb-10 border-b border-white/5 last:border-0 last:pb-0"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                                                        <h4 className="text-xl font-black text-white uppercase tracking-wider">
                                                            {campus.name}
                                                        </h4>
                                                    </div>
                                                    <div className="flex items-center gap-3 bg-black/40 px-5 py-3 rounded-2xl border border-white/10 hover:border-orange-500/30 transition-all">
                                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
                                                            Charge
                                                        </label>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-orange-500/50 font-black text-xs">
                                                                ₹
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={campus.deliveryCharge}
                                                                onChange={(e) => {
                                                                    const config = [
                                                                        ...(orderSettings.deliveryCampusConfig ||
                                                                            DEFAULT_CAMPUS_CONFIG),
                                                                    ];
                                                                    config[idx] = {
                                                                        ...config[idx],
                                                                        deliveryCharge: Math.max(
                                                                            0,
                                                                            Number(e.target.value)
                                                                        ),
                                                                    };
                                                                    setOrderSettings({
                                                                        ...orderSettings,
                                                                        deliveryCampusConfig:
                                                                            config,
                                                                    });
                                                                }}
                                                                className="w-16 bg-transparent text-sm text-orange-400 font-black outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:text-white transition-colors"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const config = [
                                                            ...(orderSettings.deliveryCampusConfig ||
                                                                DEFAULT_CAMPUS_CONFIG),
                                                        ];
                                                        config[idx] = {
                                                            ...config[idx],
                                                            slots: [
                                                                ...slots,
                                                                { start: "", end: "" },
                                                            ],
                                                        };
                                                        setOrderSettings({
                                                            ...orderSettings,
                                                            deliveryCampusConfig: config,
                                                        });
                                                    }}
                                                    className="self-start md:self-auto bg-orange-600/10 text-orange-500 hover:bg-orange-600 hover:text-white px-6 py-3 rounded-2xl text-xs font-black transition-all border border-orange-500/20 flex items-center gap-2 active:scale-95 shadow-lg shadow-orange-500/5"
                                                >
                                                    <Plus size={18} /> Add Slot
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {slots.map((slot, sIdx) => (
                                                    <div
                                                        key={sIdx}
                                                        className="group relative flex items-center gap-4 p-5 bg-black/40 border border-white/5 rounded-[1.5rem] hover:border-orange-500/40 transition-all hover:bg-black/60 shadow-inner"
                                                    >
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex justify-between items-center px-1">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                                                    Start
                                                                </label>
                                                                <span className="text-[9px] font-black text-orange-500/50">
                                                                    {format12h(slot.start)}
                                                                </span>
                                                            </div>
                                                            <input
                                                                type="time"
                                                                className="w-full bg-transparent text-sm text-white font-black focus:outline-none [color-scheme:dark]"
                                                                value={slot.start}
                                                                onChange={(e) => {
                                                                    const config = [
                                                                        ...(orderSettings.deliveryCampusConfig ||
                                                                            DEFAULT_CAMPUS_CONFIG),
                                                                    ];
                                                                    const newSlots = [...slots];
                                                                    newSlots[sIdx] = {
                                                                        ...newSlots[sIdx],
                                                                        start: e.target.value,
                                                                    };
                                                                    config[idx] = {
                                                                        ...config[idx],
                                                                        slots: newSlots,
                                                                    };
                                                                    setOrderSettings({
                                                                        ...orderSettings,
                                                                        deliveryCampusConfig:
                                                                            config,
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="w-[1px] h-10 bg-white/10" />
                                                        <div className="flex-1 space-y-2">
                                                            <div className="flex justify-between items-center px-1">
                                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                                                    End
                                                                </label>
                                                                <span className="text-[9px] font-black text-orange-500/50">
                                                                    {format12h(slot.end)}
                                                                </span>
                                                            </div>
                                                            <input
                                                                type="time"
                                                                className="w-full bg-transparent text-sm text-white font-black focus:outline-none [color-scheme:dark]"
                                                                value={slot.end}
                                                                onChange={(e) => {
                                                                    const config = [
                                                                        ...(orderSettings.deliveryCampusConfig ||
                                                                            DEFAULT_CAMPUS_CONFIG),
                                                                    ];
                                                                    const newSlots = [...slots];
                                                                    newSlots[sIdx] = {
                                                                        ...newSlots[sIdx],
                                                                        end: e.target.value,
                                                                    };
                                                                    config[idx] = {
                                                                        ...config[idx],
                                                                        slots: newSlots,
                                                                    };
                                                                    setOrderSettings({
                                                                        ...orderSettings,
                                                                        deliveryCampusConfig:
                                                                            config,
                                                                    });
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
                                                                    context: idx,
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
                                                        <Clock
                                                            size={24}
                                                            className="text-gray-500 mb-3"
                                                        />
                                                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                                            No hours scheduled for {campus.name}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <PreOrderSlotEditor
                                                isEnabled={!!campus.isPreOrderEnabled}
                                                onToggleEnabled={(next) => {
                                                    const config = [
                                                        ...(orderSettings.deliveryCampusConfig ||
                                                            DEFAULT_CAMPUS_CONFIG),
                                                    ];
                                                    config[idx] = {
                                                        ...config[idx],
                                                        isPreOrderEnabled: next,
                                                    };
                                                    setOrderSettings({
                                                        ...orderSettings,
                                                        deliveryCampusConfig: config,
                                                    });
                                                }}
                                                slots={campus.preOrderSlots || []}
                                                onSlotsChange={(preOrderSlots) => {
                                                    const config = [
                                                        ...(orderSettings.deliveryCampusConfig ||
                                                            DEFAULT_CAMPUS_CONFIG),
                                                    ];
                                                    config[idx] = {
                                                        ...config[idx],
                                                        preOrderSlots,
                                                    };
                                                    setOrderSettings({
                                                        ...orderSettings,
                                                        deliveryCampusConfig: config,
                                                    });
                                                }}
                                                label={`Pre-order Slots — ${campus.name}`}
                                                emptyText="No pre-order slots defined for this campus."
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                            <h4 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-black">
                                    ₹
                                </span>
                                Order Thresholds
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                                <FormInput
                                    label="Base Charge"
                                    type="number"
                                    value={orderSettings.baseDeliveryCharge || "30"}
                                    onChange={(e) =>
                                        setOrderSettings({
                                            ...orderSettings,
                                            baseDeliveryCharge: e.target.value,
                                        })
                                    }
                                />
                                <FormInput
                                    label="Extra Threshold"
                                    type="number"
                                    value={orderSettings.extraItemThreshold || "3"}
                                    onChange={(e) =>
                                        setOrderSettings({
                                            ...orderSettings,
                                            extraItemThreshold: e.target.value,
                                        })
                                    }
                                />
                                <FormInput
                                    label="Extra Charge"
                                    type="number"
                                    value={orderSettings.extraItemCharge || "10"}
                                    onChange={(e) =>
                                        setOrderSettings({
                                            ...orderSettings,
                                            extraItemCharge: e.target.value,
                                        })
                                    }
                                />
                                <FormInput
                                    label="Min Order"
                                    type="number"
                                    value={orderSettings.minOrderAmount || "0"}
                                    onChange={(e) =>
                                        setOrderSettings({
                                            ...orderSettings,
                                            minOrderAmount: e.target.value,
                                        })
                                    }
                                    placeholder="0"
                                />
                                <FormInput
                                    label="Light Bundle"
                                    type="number"
                                    value={orderSettings.lightItemThreshold || "5"}
                                    onChange={(e) =>
                                        setOrderSettings({
                                            ...orderSettings,
                                            lightItemThreshold: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                Light Bundle is how many units of light items count as one extra
                                charge. Which items are light or heavy is set per item, on the
                                Delivery Weight field in each restaurant&apos;s menu.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => {
                    const idx = confirmModal.context!;
                    const sIdx = confirmModal.targetId;
                    const config: CampusDeliveryDraft[] = [
                        ...(orderSettings.deliveryCampusConfig || DEFAULT_CAMPUS_CONFIG),
                    ];
                    config[idx] = {
                        ...config[idx],
                        slots: (config[idx].slots || []).filter((_, i) => i !== sIdx),
                    };
                    setOrderSettings({ ...orderSettings, deliveryCampusConfig: config });
                }}
                title="Delete Timeslot?"
                message={`Are you sure you want to delete "${confirmModal.targetName}"?`}
                confirmLabel="Delete"
            />
        </div>
    );
}
