import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Analytics | Pumato Admin",
    description: "View order analytics, revenue, and delivery metrics.",
    alternates: {
        canonical: CANONICAL_URLS.adminAnalytics,
    },
};

export default function AnalyticsLayout({ children }) {
    return children;
}
