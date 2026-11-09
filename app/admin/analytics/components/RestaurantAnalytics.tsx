"use client";

import type { DailyRollup } from "@/lib/analytics";

export default function RestaurantAnalytics({ rollups }: { rollups: DailyRollup[] }) {
    const map = new Map<
        string,
        { restaurantId: string; count: number; bySource: Record<string, number> }
    >();
    for (const r of rollups) {
        for (const item of r.restaurantViews || []) {
            const cur = map.get(item.restaurantId) ?? {
                restaurantId: item.restaurantId,
                count: 0,
                bySource: {},
            };
            cur.count += item.count;
            for (const [source, count] of Object.entries(item.bySource || {})) {
                cur.bySource[source] = (cur.bySource[source] ?? 0) + count;
            }
            map.set(item.restaurantId, cur);
        }
    }
    const top = [...map.values()].sort((a, b) => b.count - a.count).slice(0, 20);

    // Also merge top searched restaurants
    const searched = new Map<string, number>();
    for (const r of rollups) {
        for (const item of r.topSearchedRestaurants || []) {
            searched.set(item.restaurantId, (searched.get(item.restaurantId) ?? 0) + item.count);
        }
    }
    const topSearched = [...searched.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black mb-4">Most viewed restaurants</h2>
                {top.length === 0 ? (
                    <p className="text-gray-500">No data</p>
                ) : (
                    <ul className="space-y-2">
                        {top.map((item) => (
                            <li key={item.restaurantId} className="flex justify-between text-sm">
                                <span>{item.restaurantId}</span>
                                <span className="text-gray-400">
                                    {item.count} (
                                    {Object.entries(item.bySource)
                                        .map(([k, v]) => `${k}:${v}`)
                                        .join(", ")}
                                    )
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black mb-4">Most searched restaurants</h2>
                {topSearched.length === 0 ? (
                    <p className="text-gray-500">No data</p>
                ) : (
                    <ul className="space-y-2">
                        {topSearched.map(([id, count]) => (
                            <li key={id} className="flex justify-between text-sm">
                                <span>{id}</span>
                                <span className="text-gray-400">{count}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
