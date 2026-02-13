import { Shirt } from "lucide-react";

export default function LaundryHero({ pricing }) {
    return (
        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-8 border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">Laundry Service</h1>
            <div className="flex flex-col gap-3 mb-8">
                <div className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-lg text-xl font-bold w-max border border-blue-500/30 shadow-lg shadow-blue-500/10">
                    Per KG ₹{pricing.pricePerKg}
                </div>
                <div className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg text-lg font-bold w-max border border-purple-500/30 shadow-lg shadow-purple-500/10 flex items-center gap-2">
                    <span className="text-xl">💨</span> Steam Iron ₹{pricing.steamIronPrice}
                </div>
            </div>
            <p className="text-gray-400 mb-8 text-lg font-light leading-relaxed">
                Professional care for your clothes. Schedule a pickup from your hostel and get fresh, ironed clothes within 24 hours.
            </p>

            <ul className="space-y-6">
                {[
                    { icon: Shirt, text: "Wash, Steam Iron & Fold" }
                ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <item.icon size={18} />
                        </div>
                        <span className="font-medium text-gray-200">{item.text}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
