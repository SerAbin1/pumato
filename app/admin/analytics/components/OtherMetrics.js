"use client";

import { Package, XCircle, CheckCircle, Clock, DollarSign, Zap } from "lucide-react";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatHour(hour) {
  if (hour === undefined || hour === null) return "N/A";
  const h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:00 ${ampm} - ${(h12 + 1) % 12 || 12}:00 ${ampm}`;
}

export default function OtherMetrics({ metrics }) {
  const completionRate = metrics.totalOrders > 0
    ? ((metrics.completedOrders / metrics.totalOrders) * 100).toFixed(1)
    : 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-black mb-4">Other Metrics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Orders</span>
          </div>
          <p className="text-2xl font-black text-white">{metrics.totalOrders}</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Completed</span>
          </div>
          <p className="text-2xl font-black text-green-400">{metrics.completedOrders}</p>
          <p className="text-xs text-gray-500">{completionRate}% completion rate</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={16} className="text-red-400" />
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Cancelled</span>
          </div>
          <p className="text-2xl font-black text-red-400">{metrics.cancelledOrders}</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Delivery Charge</span>
          </div>
          <p className="text-2xl font-black text-blue-400">{formatCurrency(metrics.deliveryChargeEarned)}</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Item Amount</span>
          </div>
          <p className="text-2xl font-black text-white">{formatCurrency(metrics.itemAmount)}</p>
          <p className="text-xs text-gray-500">before delivery charges</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Peak Time</span>
          </div>
          <p className="text-xl font-black text-yellow-400">{formatHour(metrics.peakHour)}</p>
          <p className="text-xs text-gray-500">most orders placed</p>
        </div>
      </div>
    </div>
  );
}
