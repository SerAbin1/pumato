import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Analytics | Pumato Admin",
    description: "View order analytics, revenue, and delivery metrics.",
    alternates: {
        canonical: CANONICAL_URLS.adminAnalytics,
    },
};

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
    return children;
}
