import { useState } from 'react';
import { motion } from "framer-motion";
import { Sparkles, Phone, Plus, Trash, Upload, X } from "lucide-react";
import Image from "next/image";
import FormInput from './FormInput';
import ConfirmModal from "../../components/ConfirmModal";

export default function GlobalSettings({
    orderSettings,
    setOrderSettings,
    grocerySettings,
    setGrocerySettings,
    handleFileUpload
}) {
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, groupIdx: null, groupName: "" });
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                <h2 className="text-3xl font-black text-white mb-8">Global Settings</h2>

                <div className="max-w-2xl space-y-8">
                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <Sparkles size={18} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Payment Settings</h3>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm pl-13">Upload your Payment QR code. This will be sent as a link in the WhatsApp order message.</p>

                        <div className="pl-13 space-y-4">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Payment QR Image URL</label>
                            <div className="flex gap-4">
                                <div className="flex-1 relative group">
                                    <input
                                        type="text"
                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder-gray-600"
                                        value={orderSettings.paymentQR || ""}
                                        onChange={(e) => setOrderSettings({ ...orderSettings, paymentQR: e.target.value })}
                                        placeholder="QR Code Image URL..."
                                    />
                                </div>
                                <label className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl cursor-pointer text-white transition-colors flex items-center justify-center min-w-[60px] border border-white/10">
                                    <Upload size={20} />
                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setOrderSettings({ ...orderSettings, paymentQR: url }))} />
                                </label>
                            </div>
                            {orderSettings.paymentQR && (
                                <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 inline-block">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Preview</p>
                                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                                        <Image src={orderSettings.paymentQR} alt="Payment QR Preview" fill className="object-cover" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-6">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                                    <Phone size={18} />
                                </div>
                                <h3 className="text-xl font-bold text-white">WhatsApp Numbers</h3>
                            </div>
                        </div>
                        <p className="text-gray-400 text-sm pl-13">Configure the WhatsApp numbers for order redirects. Include country code without + (e.g., 919048086503).</p>

                        <div className="pl-13 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormInput
                                label="Food Delivery"
                                type="tel"
                                value={orderSettings.whatsappNumber || ""}
                                onChange={(e) => setOrderSettings({ ...orderSettings, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                                placeholder="919048086503"
                            />
                            <FormInput
                                label="Laundry"
                                type="tel"
                                value={orderSettings.laundryWhatsappNumber || ""}
                                onChange={(e) => setOrderSettings({ ...orderSettings, laundryWhatsappNumber: e.target.value.replace(/\D/g, '') })}
                                placeholder="919048086503"
                            />
                            <FormInput
                                label="Grocery"
                                type="tel"
                                value={grocerySettings.whatsappNumber || ""}
                                onChange={(e) => setGrocerySettings({ ...grocerySettings, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                                placeholder="919048086503"
                            />
                        </div>

                        <div className="pl-13 mt-4">
                            <FormInput
                                label="UPI ID (for order message)"
                                type="text"
                                value={orderSettings.upiId || ""}
                                onChange={(e) => setOrderSettings({ ...orderSettings, upiId: e.target.value })}
                                placeholder="example@upi"
                            />
                            <p className="text-xs text-gray-500 mt-2">This UPI ID will be included in the WhatsApp order message for payment.</p>
                        </div>

                        <div className="pl-13 mt-4">
                            <FormInput
                                label="Google Sheet URL (for orders)"
                                type="url"
                                value={orderSettings.googleSheetUrl || ""}
                                onChange={(e) => setOrderSettings({ ...orderSettings, googleSheetUrl: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-2">Orders will be logged to this Google Apps Script URL. Leave empty to disable.</p>
                        </div>
                    </div>

                    {/* WhatsApp Community Groups */}
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Phone size={18} className="text-green-500" /> Community Groups
                            </h3>
                            <button
                                type="button"
                                onClick={() => setOrderSettings({
                                    ...orderSettings,
                                    whatsappGroups: [...(orderSettings.whatsappGroups || []), { name: "", link: "" }]
                                })}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"
                            >
                                <Plus size={14} /> Add Group
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Add WhatsApp group invite links. These will appear in the navbar under "Community".</p>

                        {(orderSettings.whatsappGroups || []).length === 0 ? (
                            <p className="text-sm text-gray-500 italic text-center py-4">No community groups added yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {(orderSettings.whatsappGroups || []).map((group, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder="Group Name"
                                            value={group.name}
                                            onChange={(e) => {
                                                const updated = [...orderSettings.whatsappGroups];
                                                updated[idx].name = e.target.value;
                                                setOrderSettings({ ...orderSettings, whatsappGroups: updated });
                                            }}
                                            className="flex-1 bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500"
                                        />
                                        <input
                                            type="url"
                                            placeholder="https://chat.whatsapp.com/..."
                                            value={group.link}
                                            onChange={(e) => {
                                                const updated = [...orderSettings.whatsappGroups];
                                                updated[idx].link = e.target.value;
                                                setOrderSettings({ ...orderSettings, whatsappGroups: updated });
                                            }}
                                            className="flex-[2] bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfirmModal({
                                                    isOpen: true,
                                                    groupIdx: idx,
                                                    groupName: group.name || 'Untitled'
                                                });
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => {
                    const updated = orderSettings.whatsappGroups.filter((_, i) => i !== confirmModal.groupIdx);
                    setOrderSettings({ ...orderSettings, whatsappGroups: updated });
                }}
                title="Remove Community Group?"
                message={`Are you sure you want to remove "${confirmModal.groupName}"?`}
                confirmLabel="Remove"
            />
        </motion.div>
    );
}
