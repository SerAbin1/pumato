import { Sparkles, Eye, EyeOff, Upload, X } from "lucide-react";
import FormInput from './FormInput';

export default function BannersTab({
    banners,
    setBanners,
    handleFileUpload
}) {
    return (
        <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-4xl mx-auto shadow-2xl">
            <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-6 flex items-center gap-3">
                <Sparkles className="text-yellow-500" /> Manage Promo Banners
            </h2>

            <div className="grid gap-8">
                {[1, 2, 3].map(num => {
                    const bannerKey = `banner${num}`;
                    const banner = banners[bannerKey] || {};

                    return (
                        <div key={num} className={`bg-black/30 p-6 rounded-2xl border border-white/10 relative overflow-hidden ${banner.hidden ? 'opacity-50' : ''}`}>
                            <div className="absolute top-0 right-0 p-4 opacity-50 font-black text-6xl text-white/5 pointer-events-none">{num}</div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-200 uppercase tracking-wider">Banner {num}</h3>
                                <button
                                    onClick={() => setBanners({ ...banners, [bannerKey]: { ...banner, hidden: !banner.hidden } })}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${banner.hidden ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'}`}
                                    title={banner.hidden ? "Click to show banner" : "Click to hide banner"}
                                >
                                    {banner.hidden ? <><EyeOff size={16} /> Hidden</> : <><Eye size={16} /> Visible</>}
                                </button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Title (e.g. 50% OFF)"
                                    value={banner.title || ""}
                                    onChange={(e) => setBanners({ ...banners, [bannerKey]: { ...banner, title: e.target.value } })}
                                />
                                <FormInput
                                    label="Subtitle (e.g. Welcome Bonus)"
                                    value={banner.sub || ""}
                                    onChange={(e) => setBanners({ ...banners, [bannerKey]: { ...banner, sub: e.target.value } })}
                                />

                                {/* Gradient Picker */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Background Style</label>
                                    <select
                                        value={banner.gradient || ""}
                                        onChange={(e) => setBanners({ ...banners, [bannerKey]: { ...banner, gradient: e.target.value } })}
                                        className="w-full p-4 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50 appearance-none font-medium"
                                    >
                                        <option value="from-blue-600 to-blue-900">Ocean Blue</option>
                                        <option value="from-orange-500 to-red-600">Sunset Orange</option>
                                        <option value="from-emerald-600 to-emerald-900">Forest Green</option>
                                        <option value="from-purple-600 to-purple-900">Royal Purple</option>
                                        <option value="from-pink-500 to-rose-500">Hot Pink</option>
                                        <option value="from-gray-800 to-black">Midnight Black</option>
                                    </select>
                                </div>

                                {/* Image Upload */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Banner Image (Optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium text-sm"
                                            value={banner.image || ""}
                                            onChange={(e) => setBanners({ ...banners, [bannerKey]: { ...banner, image: e.target.value } })}
                                            placeholder="Image URL..."
                                        />
                                        <label className="bg-white/10 hover:bg-white/20 p-4 rounded-xl cursor-pointer text-white transition-colors flex-shrink-0">
                                            <Upload size={20} />
                                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, (url) => setBanners({ ...banners, [bannerKey]: { ...banner, image: url } }))} />
                                        </label>
                                        {banner.image && (
                                            <button
                                                onClick={() => setBanners({ ...banners, [bannerKey]: { ...banner, image: "" } })}
                                                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 p-4 rounded-xl border border-red-500/20 transition-colors"
                                                title="Remove Image"
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 pt-8 border-t border-white/10 flex justify-end opacity-0 pointer-events-none">
                <button className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold">Update</button>
            </div>
        </div>
    );
}
