"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

function formatMinutes(minutes) {
  if (!minutes || minutes < 0) return "0 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

const STAGE_COLORS = ["#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];

export default function DelayBreakdown({ breakdown }) {
  const stages = [
    {
      key: "placedToConfirmed",
      label: "Placed → Confirmed",
      sub: "Admin response",
      avg: breakdown.placedToConfirmed?.avg || 0,
      count: breakdown.placedToConfirmed?.count || 0,
    },
    {
      key: "confirmedToViewed",
      label: "Confirmed → Viewed",
      sub: "Partner response",
      avg: breakdown.confirmedToViewed?.avg || 0,
      count: breakdown.confirmedToViewed?.count || 0,
    },
    {
      key: "viewedToReady",
      label: "Viewed → Ready",
      sub: "Prep time",
      avg: breakdown.viewedToReady?.avg || 0,
      count: breakdown.viewedToReady?.count || 0,
    },
    {
      key: "readyToPickedUp",
      label: "Ready → Picked Up",
      sub: "Pickup delay",
      avg: breakdown.readyToPickedUp?.avg || 0,
      count: breakdown.readyToPickedUp?.count || 0,
    },
    {
      key: "pickedUpToDelivered",
      label: "Picked Up → Delivered",
      sub: "Travel time",
      avg: breakdown.pickedUpToDelivered?.avg || 0,
      count: breakdown.pickedUpToDelivered?.count || 0,
    },
  ];

  const totalDelay = stages.reduce((sum, s) => sum + s.avg, 0);

  const data = stages.map((stage) => ({
    ...stage,
    percentage: totalDelay > 0 ? ((stage.avg / totalDelay) * 100).toFixed(1) : 0,
  }));

  if (totalDelay === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-black mb-4">Delay Breakdown</h2>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No delay data available
        </div>
      </div>
    );
  }

  const sortedByDelay = [...data].sort((a, b) => b.avg - a.avg);
  const slowestStage = sortedByDelay[0];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black">Delay Breakdown</h2>
        <div className="text-sm text-gray-400">
          Slowest: <span className="text-orange-400 font-bold">{slowestStage.label}</span>
        </div>
      </div>

      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `${Math.round(v)}m`}
              stroke="#666"
              tick={{ fill: "#666", fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="#666"
              tick={{ fill: "#666", fontSize: 12 }}
              width={140}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
              }}
              formatter={(value, name) => [formatMinutes(value), "Avg Time"]}
            />
            <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STAGE_COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {data.map((stage, idx) => (
          <div
            key={stage.key}
            className={`p-3 rounded-xl border ${
              stage.key === slowestStage.key
                ? "bg-orange-500/10 border-orange-500/30"
                : "bg-white/5 border-white/10"
            }`}
          >
            <p className="text-xs text-gray-400 mb-1">{stage.sub}</p>
            <p className="text-lg font-black text-white">{formatMinutes(stage.avg)}</p>
            <p className="text-xs text-gray-500">{stage.percentage}% of total</p>
          </div>
        ))}
      </div>
    </div>
  );
}
