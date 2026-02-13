import { User, Phone, MapPin, Plus, X, Send } from "lucide-react";
import { motion } from "framer-motion";
import SlotSelector from "./SlotSelector";

export default function LaundryForm({
    formData,
    handleChange,
    setFormData,
    campusConfig,
    availableSlots,
    loadingSlots,
    today,
    items,
    handleAddItem,
    handleRemoveItem,
    handleItemChange,
    handleSubmit,
    newItemRef
}) {
    return (
        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-4 md:p-10 border border-white/10 relative shadow-2xl">
            <h2 className="text-2xl font-bold mb-8 text-white">Request Pickup</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Your Name</label>
                    <div className="relative group">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="text"
                            name="name"
                            required
                            placeholder="John Doe"
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-black/40 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium text-white placeholder-gray-600"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Phone Number</label>
                    <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="tel"
                            name="phone"
                            required
                            maxLength={10}
                            placeholder="10-digit phone number"
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-black/40 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium text-white placeholder-gray-600"
                            value={formData.phone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setFormData({ ...formData, phone: val });
                            }}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Campus</label>
                    <div className="grid grid-cols-3 gap-3">
                        {campusConfig.map((campus) => (
                            <button
                                key={campus.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, campus: campus.id })}
                                className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all flex flex-col items-center justify-center gap-1 ${formData.campus === campus.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                            >
                                <span>{campus.name}</span>
                                {campus.deliveryCharge > 0 && (
                                    <span className="text-[10px] opacity-70 bg-white/10 px-1.5 rounded-full">+₹{campus.deliveryCharge}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Hostel</label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                        <input
                            type="text"
                            name="location"
                            required
                            placeholder="Hostel Name (e.g. SRK)"
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-black/40 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium text-white placeholder-gray-600"
                            value={formData.location}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Slot Selector Component */}
                <SlotSelector
                    formData={formData}
                    setFormData={setFormData}
                    availableSlots={availableSlots}
                    loadingSlots={loadingSlots}
                    today={today}
                />

                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">Special Instructions (Optional)</label>
                    <textarea
                        name="instructions"
                        placeholder="e.g. Handle silk items carefully"
                        className="w-full px-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all font-medium text-white placeholder-gray-600 h-24 resize-none"
                        value={formData.instructions}
                        onChange={handleChange}
                    />
                </div>

                <hr className="border-white/5 border-dashed my-6" />

                {/* Dynamic Laundry List */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-gray-400 ml-1">Clothing Items</label>
                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={item.id} className="flex flex-wrap gap-2 items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <div className="bg-black/20 border border-white/10 rounded-lg flex-1 flex items-center px-3 focus-within:border-blue-500/50 focus-within:bg-black/40 transition-all">
                                    <span className="text-gray-500 font-bold mr-2 text-xs">{index + 1}.</span>
                                    <input
                                        ref={index === items.length - 1 ? newItemRef : null}
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                        className="bg-transparent border-none outline-none w-full py-2.5 text-white placeholder-gray-600 font-medium text-sm"
                                        placeholder="Item (e.g. Shirt)"
                                    />
                                </div>
                                <div className="w-14 bg-black/20 border border-white/10 rounded-lg flex items-center px-2 focus-within:border-blue-500/50 focus-within:bg-black/40 transition-all flex-shrink-0">
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                        className="bg-transparent border-none outline-none w-full py-2.5 text-white placeholder-gray-600 font-medium text-center text-sm"
                                        placeholder="Qty"
                                    />
                                </div>
                                <label className="flex items-center gap-1.5 text-[10px] text-gray-400 cursor-pointer select-none hover:text-white transition-colors border border-white/10 px-2 py-2 rounded-lg bg-black/20 hover:bg-black/30 flex-shrink-0 leading-tight">
                                    <input
                                        type="checkbox"
                                        checked={item.steamIron}
                                        onChange={(e) => handleItemChange(item.id, 'steamIron', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-700/50 accent-blue-500"
                                    />
                                    <span className="flex flex-col"><span>Steam</span><span>Iron</span></span>
                                </label>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center flex-shrink-0"
                                        aria-label="Remove item"
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleAddItem}
                        className="text-xs font-bold text-green-400 hover:text-green-300 transition-colors flex items-center gap-1 ml-1"
                    >
                        <Plus size={14} /> Add Another Item
                    </button>
                </div>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group mt-2"
                >
                    <Send size={20} className="group-hover:translate-x-1 transition-transform" />
                    <span>Schedule Pickup via WhatsApp</span>
                </motion.button>

                <p className="text-xs text-center text-gray-500 mt-4">
                    You will be redirected to WhatsApp to complete your booking.
                </p>
            </form>
        </div>
    );
}
