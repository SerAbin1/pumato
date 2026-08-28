"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";
import { initPerformance } from "@/lib/performance";

export default function AnalyticsInit() {
    useEffect(() => {
        initAnalytics();
        initPerformance();
    }, []);

    return null;
}
