"use client";

import type { DailyRollup } from "@/lib/analytics";

function mergeTerms(rollups: DailyRollup[]) {
    const map = new Map<string, number>();
    for (const r of rollups) {
        for (const t of r.topSearchTerms || []) {
            map.set(t.term, (map.get(t.term) ?? 0) + t.count);
        }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
}

function mergeZero(rollups: DailyRollup[]) {
    const map = new Map<string, number>();
    for (const r of rollups) {
        for (const t of r.zeroResultSearches || []) {
            map.set(t.term, (map.get(t.term) ?? 0) + t.count);
        }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
}

export default function SearchAnalytics({ rollups }: { rollups: DailyRollup[] }) {
    const totalSearches = rollups.reduce((s, r) => s + (r.searches?.total || 0), 0);
    const global = rollups.reduce((s, r) => s + (r.searches?.byScope?.global || 0), 0);
    const inRestaurant = rollups.reduce(
        (s, r) => s + (r.searches?.byScope?.restaurant_menu || 0),
        0
    );
    const uniqueVisitors = rollups.reduce((s, r) => s + (r.searches?.uniqueVisitors || 0), 0);
    const topTerms = mergeTerms(rollups);
    const zeroResults = mergeZero(rollups);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-sm text-gray-400 mb-1">Total searches</p>
                    <p className="text-3xl font-black">{totalSearches}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-sm text-gray-400 mb-1">Global searches</p>
                    <p className="text-3xl font-black">{global}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-sm text-gray-400 mb-1">In-restaurant searches</p>
                    <p className="text-3xl font-black">{inRestaurant}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <p className="text-sm text-gray-400 mb-1">Unique visitors (sum)</p>
                    <p className="text-3xl font-black">{uniqueVisitors}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-black mb-4">Top search terms</h2>
                    {topTerms.length === 0 ? (
                        <p className="text-gray-500">No data</p>
                    ) : (
                        <ul className="space-y-2">
                            {topTerms.map(([term, count]) => (
                                <li key={term} className="flex justify-between text-sm">
                                    <span>{term}</span>
                                    <span className="text-gray-400">{count}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h2 className="text-lg font-black mb-4">Zero-result searches</h2>
                    {zeroResults.length === 0 ? (
                        <p className="text-gray-500">No data</p>
                    ) : (
                        <ul className="space-y-2">
                            {zeroResults.map(([term, count]) => (
                                <li key={term} className="flex justify-between text-sm">
                                    <span>{term}</span>
                                    <span className="text-gray-400">{count}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
