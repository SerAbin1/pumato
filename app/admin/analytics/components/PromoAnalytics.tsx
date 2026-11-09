"use client";

import type { DailyRollup } from "@/lib/analytics";

export default function PromoAnalytics({ rollups }: { rollups: DailyRollup[] }) {
    const impressions = rollups.reduce((s, r) => s + (r.promos?.impressions || 0), 0);
    const clicks = rollups.reduce((s, r) => s + (r.promos?.clicks || 0), 0);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    const map = new Map<string, { listingId: string; impressions: number; clicks: number }>();
    for (const r of rollups) {
        for (const item of r.promos?.byListing || []) {
            const cur = map.get(item.listingId) ?? {
                listingId: item.listingId,
                impressions: 0,
                clicks: 0,
            };
            cur.impressions += item.impressions;
            cur.clicks += item.clicks;
            map.set(item.listingId, cur);
        }
    }
    const top = [...map.values()]
        .map((v) => ({ ...v, ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0 }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-sm text-gray-400 mb-1">Impressions</p>
                    <p className="text-3xl font-black">{impressions}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-sm text-gray-400 mb-1">Clicks</p>
                    <p className="text-3xl font-black">{clicks}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-sm text-gray-400 mb-1">CTR</p>
                    <p className="text-3xl font-black">{ctr.toFixed(1)}%</p>
                </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black mb-4">By listing</h2>
                {top.length === 0 ? (
                    <p className="text-gray-500">No data</p>
                ) : (
                    <ul className="space-y-2">
                        {top.map((item) => (
                            <li key={item.listingId} className="flex justify-between text-sm">
                                <span>{item.listingId}</span>
                                <span className="text-gray-400">
                                    {item.impressions} imp / {item.clicks} clicks (
                                    {item.ctr.toFixed(1)}%)
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
