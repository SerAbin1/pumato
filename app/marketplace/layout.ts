import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Marketplace | Pumato",
    description: "Buy, sell, and discover items on campus marketplace.",
    alternates: {
        canonical: CANONICAL_URLS.marketplace,
    },
};

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
    return children;
}
