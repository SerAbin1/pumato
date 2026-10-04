import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Food Delivery | Pumato",
    description: "Browse restaurants and order food delivered to your hostel.",
    alternates: {
        canonical: CANONICAL_URLS.delivery,
    },
};

export default function DeliveryLayout({ children }: { children: ReactNode }) {
    return children;
}
