import type { LaundryPricing } from "@/lib/types";
import { selectableCategories } from "../estimate";

export default function LaundryHero({ pricing }: { pricing: LaundryPricing }) {
    const categories = selectableCategories(pricing);
    return (
        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-5 md:p-8 border border-white/10 relative overflow-hidden flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>

            <div className="min-w-0">
                <h1 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
                    Laundry Service
                </h1>
                <p className="text-gray-400 text-base md:text-lg font-light leading-relaxed">
                    Professional care for your clothes. Schedule a pickup from your hostel and get
                    fresh, ironed clothes.
                </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end lg:max-w-[50%]">
                {categories.map((category) => (
                    <div
                        key={category.id}
                        className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm md:text-base font-bold border border-blue-500/30 shadow-lg shadow-blue-500/10 whitespace-nowrap"
                    >
                        {category.name} ₹{category.pricePerKg}/kg
                    </div>
                ))}
                {categories.some((c) => c.steamIronEnabled) && (
                    <div className="bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg text-sm md:text-base font-bold border border-purple-500/30 shadow-lg shadow-purple-500/10 flex items-center gap-1.5 whitespace-nowrap">
                        <span>💨</span> Steam Iron ₹{pricing.steamIronPrice}
                    </div>
                )}
            </div>
        </div>
    );
}
