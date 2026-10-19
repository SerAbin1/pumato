import type { Dispatch, SetStateAction } from "react";
import type { LaundryPricing } from "@/lib/types";
import type { LaundryItemDraft } from "../types";
import { estimateLaundry } from "../estimate";

interface PriceEstimateProps {
    items: LaundryItemDraft[];
    pricing: LaundryPricing;
    estimatedWeights: Record<string, number>;
    setEstimatedWeights: Dispatch<SetStateAction<Record<string, number>>>;
}

export default function PriceEstimate({
    items,
    pricing,
    estimatedWeights,
    setEstimatedWeights,
}: PriceEstimateProps) {
    const estimate = estimateLaundry(items, pricing, estimatedWeights);

    return (
        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-yellow-400">⚡</span>Price Estimate
            </h3>

            <div className="space-y-6">
                {estimate.lines.length === 0 && (
                    <p className="text-sm text-gray-500">
                        Pick a wash type for your items to see the estimate.
                    </p>
                )}
                {estimate.lines.map((line) => (
                    <div key={line.key}>
                        <div className="flex justify-between text-sm font-bold text-gray-400 mb-2">
                            <span>{line.label} Weight</span>
                            <span className="text-white">{line.weight} Kg</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="20"
                            step="0.5"
                            value={line.weight}
                            onChange={(e) =>
                                setEstimatedWeights((prev) => ({
                                    ...prev,
                                    [line.key]: parseFloat(e.target.value),
                                }))
                            }
                            aria-label={`${line.label} weight`}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider">
                            <span>1 Kg</span>
                            <span>10 Kg</span>
                            <span>20 Kg</span>
                        </div>
                    </div>
                ))}

                <div className="space-y-2 pt-4 border-t border-white/5">
                    {estimate.lines.map((line) => (
                        <div key={line.key} className="flex justify-between text-sm text-gray-400">
                            <span>
                                {line.label} ({line.weight}kg x ₹{line.pricePerKg})
                            </span>
                            <span>₹{line.amount}</span>
                        </div>
                    ))}
                    {estimate.steamIronCount > 0 && (
                        <div className="flex justify-between text-sm text-gray-400">
                            <span>Steam Ironing ({estimate.steamIronCount} items)</span>
                            <span>₹{estimate.steamIronAmount}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-xl font-black text-white pt-2 border-t border-white/10">
                        <span>Estimated Total</span>
                        <span className="text-green-400">₹{estimate.total}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 italic">
                        *Delivery charges (if applicable) are extra.
                    </p>
                </div>
            </div>
        </div>
    );
}
