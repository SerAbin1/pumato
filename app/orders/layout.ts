import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "My Orders | Pumato",
    description: "View your order history and track deliveries.",
    alternates: {
        canonical: CANONICAL_URLS.orders,
    },
};

export default function OrdersLayout({ children }: { children: ReactNode }) {
    return children;
}
