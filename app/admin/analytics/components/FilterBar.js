"use client";

import { useState } from "react";

const PRESETS = [
  { id: "7days", label: "Last 7 Days" },
  { id: "30days", label: "Last 30 Days" },
  { id: "90days", label: "Last 90 Days" },
];

export default function FilterBar({ preset, customRange, onPresetChange, onCustomRangeChange }) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onCustomRangeChange(new Date(customStart), new Date(customEnd));
      setShowCustom(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPresetChange(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              preset === p.id && !customRange.start
                ? "bg-orange-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            customRange.start
              ? "bg-orange-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          />
          <button
            onClick={handleCustomApply}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-bold text-white transition-all"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
