import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Pumato - Food Delivery for Students",
    description: "Fueling Pondicherry's students with fast, affordable food delivery to hostels.",
    alternates: {
        canonical: CANONICAL_URLS.foodMarketing,
    },
};

export default function FoodMarketingLayout({ children }: { children: ReactNode }) {
    return children;
}
