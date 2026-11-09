"use client";

import type { DailyRollup } from "@/lib/analytics";

export default function TrendingAnalytics({ rollups }: { rollups: DailyRollup[] }) {
    const sectionViews = rollups.reduce((s, r) => s + (r.trending?.sectionViews || 0), 0);
    const clicks = rollups.reduce((s, r) => s + (r.trending?.clicks || 0), 0);
    const ctr = sectionViews > 0 ? (clicks / sectionViews) * 100 : 0;

    const map = new Map<string, { restaurantId: string; itemId: string; count: number }>();
    for (const r of rollups) {
        for (const item of r.trending?.byItem || []) {
            const key = `${item.restaurantId}:${item.itemId}`;
            const cur = map.get(key) ?? { ...item, count: 0 };
            cur.count += item.count;
            map.set(key, cur);
        }
    }
    const top = [...map.values()].sort((a, b) => b.count - a.count).slice(0, 20);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-sm text-gray-400 mb-1">Section views</p>
                    <p className="text-3xl font-black">{sectionViews}</p>
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
                <h2 className="text-lg font-black mb-4">Top clicked trending items</h2>
                {top.length === 0 ? (
                    <p className="text-gray-500">No data</p>
                ) : (
                    <ul className="space-y-2">
                        {top.map((item) => (
                            <li
                                key={`${item.restaurantId}:${item.itemId}`}
                                className="flex justify-between text-sm"
                            >
                                <span>
                                    {item.restaurantId} / {item.itemId}
                                </span>
                                <span className="text-gray-400">{item.count}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
