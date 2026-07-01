import { User, Phone, Tag, IndianRupee, FileText, Send } from "lucide-react";
import { motion } from "framer-motion";
import { MARKETPLACE_CATEGORIES } from "@/lib/constants";

export default function SellForm({
    formData,
    handleChange,
    setFormData,
    campusConfig,
    handleSubmit,
}) {
    return (
        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-4 md:p-10 border border-white/10 relative shadow-2xl w-full max-w-full overflow-hidden">
            <h2 className="text-2xl font-bold mb-2 text-white">List an Item for Sale</h2>
            <p className="text-sm text-gray-400 mb-8">
                Submit your item details below. Our admin team will reach out on WhatsApp to confirm
                photos and publish your listing on the Marketplace.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">
                        Item Name
                    </label>
                    <div className="relative group">
                        <Tag
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors"
                            size={20}
                        />
                        <input
                            type="text"
                            name="itemName"
                            required
                            placeholder="e.g. Study Table, Bicycle, Textbook"
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-black/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-medium text-white placeholder-gray-600"
                            value={formData.itemName}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">
                        Description
                    </label>
                    <div className="relative group">
                        <FileText
                            className="absolute left-4 top-4 text-gray-500 group-focus-within:text-purple-400 transition-colors"
                            size={20}
                        />
                        <textarea
                            name="description"
                            required
                            placeholder="Condition, age, reason for selling, etc."
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-black/40 transition-all font-medium text-white placeholder-gray-600 h-28 resize-none"
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">
                        Asking Price (₹)
                    </label>
                    <div className="relative group">
                        <IndianRupee
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors"
                            size={20}
                        />
                        <input
                            type="number"
                            name="askingPrice"
                            min="0"
                            required
                            placeholder="e.g. 1500"
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-black/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-medium text-white placeholder-gray-600"
                            value={formData.askingPrice}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">
                        Category
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {MARKETPLACE_CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setFormData({ ...formData, category: cat })}
                                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all ${formData.category === cat ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50" : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">
                        Campus
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {campusConfig.map((campus) => (
                            <button
                                key={campus.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, campus: campus.id })}
                                className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${formData.campus === campus.id ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50" : "bg-black/20 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"}`}
                            >
                                {campus.name}
                            </button>
                        ))}
                    </div>
                </div>

                <hr className="border-white/5 border-dashed my-6" />

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">
                        Your Name
                    </label>
                    <div className="relative group">
                        <User
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors"
                            size={20}
                        />
                        <input
                            type="text"
                            name="sellerName"
                            required
                            placeholder="John Doe"
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-black/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-medium text-white placeholder-gray-600"
                            value={formData.sellerName}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2 ml-1">
                        Your WhatsApp Number
                    </label>
                    <div className="relative group">
                        <Phone
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-400 transition-colors"
                            size={20}
                        />
                        <input
                            type="tel"
                            name="sellerWhatsApp"
                            required
                            maxLength={10}
                            placeholder="10-digit phone number"
                            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:bg-black/40 focus:ring-1 focus:ring-purple-500/20 transition-all font-medium text-white placeholder-gray-600"
                            value={formData.sellerWhatsApp}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                setFormData({ ...formData, sellerWhatsApp: val });
                            }}
                        />
                    </div>
                </div>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group mt-2"
                >
                    <Send size={20} className="group-hover:translate-x-1 transition-transform" />
                    <span>Submit Request via WhatsApp</span>
                </motion.button>

                <p className="text-xs text-center text-gray-500 mt-4">
                    You will be redirected to WhatsApp to complete your submission. Our team will
                    follow up to confirm photos before publishing.
                </p>
            </form>
        </div>
    );
}
