"use client";

import { DollarSign, TrendingUp, ShoppingBag, Clock } from "lucide-react";

function MetricCard({ title, value, subValue, icon: Icon, colorClass }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${colorClass}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      {subValue && <p className="text-xs text-gray-500">{subValue}</p>}
    </div>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatMinutes(minutes) {
  if (!minutes || minutes < 0) return "0 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

export default function MetricsCards({ metrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Revenue"
        value={formatCurrency(metrics.revenue)}
        subValue={`${metrics.completedOrders} orders`}
        icon={DollarSign}
        colorClass="bg-green-500/20 text-green-400"
      />
      <MetricCard
        title="Profit"
        value={formatCurrency(metrics.profit)}
        subValue={`${((metrics.profit / metrics.revenue) * 100 || 0).toFixed(1)}% margin`}
        icon={TrendingUp}
        colorClass="bg-purple-500/20 text-purple-400"
      />
      <MetricCard
        title="Avg Order"
        value={formatCurrency(metrics.avgOrderAmount)}
        subValue="per order"
        icon={ShoppingBag}
        colorClass="bg-blue-500/20 text-blue-400"
      />
      <MetricCard
        title="Avg Delivery"
        value={formatMinutes(metrics.avgDeliveryTime)}
        subValue="placed → delivered"
        icon={Clock}
        colorClass="bg-orange-500/20 text-orange-400"
      />
    </div>
  );
}
