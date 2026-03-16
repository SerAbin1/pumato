"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import FilterBar from "./components/FilterBar";
import MetricsCards from "./components/MetricsCards";
import RevenueChart from "./components/RevenueChart";
import DelayBreakdown from "./components/DelayBreakdown";
import OtherMetrics from "./components/OtherMetrics";

const DATE_PRESETS = {
  "7days": { label: "Last 7 Days", days: 7 },
  "30days": { label: "Last 30 Days", days: 30 },
  "90days": { label: "Last 90 Days", days: 90 },
};

function getDateRange(preset) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - DATE_PRESETS[preset].days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function computeMetrics(orders) {
  const completedOrders = orders.filter((o) => o.status === "delivered");
  const totalOrders = orders.length;
  const cancelledOrders = orders.filter(
    (o) => o.status === "cancelled" || o.status === "oos_acknowledged"
  ).length;

  const revenue = completedOrders.reduce((sum, o) => sum + (o.finalTotal || o.total || 0), 0);

  const itemAmount = completedOrders.reduce((sum, o) => {
    return sum + (o.items?.reduce((s, i) => s + (i.price || 0) * i.quantity, 0) || 0);
  }, 0);

  const profit = revenue - itemAmount;
  const deliveryChargeEarned = completedOrders.reduce(
    (sum, o) => sum + (o.deliveryCharge || 0),
    0
  );

  const avgOrderAmount = completedOrders.length > 0 ? revenue / completedOrders.length : 0;

  const deliveryTimes = completedOrders
    .map((o) => {
      const created = o.createdAt?.toDate?.() || new Date(o.createdAt);
      const delivered = o.deliveredAt?.toDate?.() || new Date(o.deliveredAt);
      return delivered - created;
    })
    .filter((t) => t > 0);

  const avgDeliveryTime =
    deliveryTimes.length > 0
      ? deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length / 60000
      : 0;

  const getStageDelay = (getFrom, getTo) => {
    const delays = completedOrders
      .map((o) => {
        const from = getFrom(o)?.toDate?.() || new Date(getFrom(o));
        const to = getTo(o)?.toDate?.() || new Date(getTo(o));
        return to - from;
      })
      .filter((t) => t > 0);
    const avg = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length / 60000 : 0;
    return { avg, count: delays.length };
  };

  const breakdown = {
    placedToConfirmed: getStageDelay((o) => o.createdAt, (o) => o.adminProcessedAt),
    confirmedToViewed: getStageDelay((o) => o.adminProcessedAt, (o) => o.partnerViewedAt),
    viewedToReady: getStageDelay((o) => o.partnerViewedAt, (o) => o.readyAt),
    readyToPickedUp: getStageDelay((o) => o.readyAt, (o) => o.pickedUpAt),
    pickedUpToDelivered: getStageDelay((o) => o.pickedUpAt, (o) => o.deliveredAt),
  };

  const hourCounts = {};
  completedOrders.forEach((o) => {
    const hour = o.createdAt?.toDate?.()?.getHours();
    if (hour !== undefined) hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const peakHour = sortedHours[0]?.[0];

  const revenueByDate = {};
  completedOrders.forEach((o) => {
    const date = o.createdAt?.toDate?.()?.toISOString().split("T")[0];
    if (date) {
      revenueByDate[date] = (revenueByDate[date] || 0) + (o.finalTotal || o.total || 0);
    }
  });

  const profitByDate = {};
  completedOrders.forEach((o) => {
    const date = o.createdAt?.toDate?.()?.toISOString().split("T")[0];
    if (date) {
      const orderItemAmount =
        o.items?.reduce((s, i) => s + (i.price || 0) * i.quantity, 0) || 0;
      profitByDate[date] = (profitByDate[date] || 0) + (o.finalTotal || o.total || 0) - orderItemAmount;
    }
  });

  const chartData = Object.keys(revenueByDate)
    .sort()
    .map((date) => ({
      date,
      revenue: revenueByDate[date] || 0,
      profit: profitByDate[date] || 0,
    }));

  return {
    totalOrders,
    completedOrders: completedOrders.length,
    cancelledOrders,
    revenue,
    profit,
    itemAmount,
    deliveryChargeEarned,
    avgOrderAmount,
    avgDeliveryTime,
    breakdown,
    peakHour,
    chartData,
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [preset, setPreset] = useState("30days");
  const [customRange, setCustomRange] = useState({ start: null, end: null });

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      let startDate, endDate;

      if (customRange.start && customRange.end) {
        startDate = customRange.start;
        endDate = customRange.end;
      } else {
        const range = getDateRange(preset);
        startDate = range.start;
        endDate = range.end;
      }

      const q = query(
        collection(db, "orders"),
        where("createdAt", ">=", Timestamp.fromDate(startDate)),
        where("createdAt", "<=", Timestamp.fromDate(endDate)),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      const ordersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        adminProcessedAt:
          doc.data().adminProcessedAt?.toDate?.() || doc.data().adminProcessedAt,
        partnerViewedAt:
          doc.data().partnerViewedAt?.toDate?.() || doc.data().partnerViewedAt,
        readyAt: doc.data().readyAt?.toDate?.() || doc.data().readyAt,
        pickedUpAt: doc.data().pickedUpAt?.toDate?.() || doc.data().pickedUpAt,
        deliveredAt: doc.data().deliveredAt?.toDate?.() || doc.data().deliveredAt,
      }));

      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [preset, customRange]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    setCustomRange({ start: null, end: null });
    setTimeout(() => fetchOrders(true), 0);
  };

  const handleCustomRangeChange = (start, end) => {
    setCustomRange({ start, end });
    setPreset(null);
    setTimeout(() => fetchOrders(true), 0);
  };

  const metrics = useMemo(() => computeMetrics(orders), [orders]);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin")}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
          </div>
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <FilterBar
          preset={preset}
          customRange={customRange}
          onPresetChange={handlePresetChange}
          onCustomRangeChange={handleCustomRangeChange}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            <MetricsCards metrics={metrics} />
            <RevenueChart data={metrics.chartData} />
            <DelayBreakdown breakdown={metrics.breakdown} />
            <OtherMetrics metrics={metrics} />
          </>
        )}
      </div>
    </div>
  );
}
