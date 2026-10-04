import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Post on Marketplace | Pumato",
    description: "Create a listing to sell items, find roommates, or post opportunities.",
    alternates: {
        canonical: CANONICAL_URLS.marketplaceSell,
    },
};

export default function MarketplaceSellLayout({ children }: { children: ReactNode }) {
    return children;
}
