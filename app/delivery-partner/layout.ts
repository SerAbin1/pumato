import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Delivery Partner | Pumato",
    description: "Pumato delivery partner dashboard",
    alternates: {
        canonical: CANONICAL_URLS.deliveryPartner,
    },
};

export default function DeliveryPartnerLayout({ children }: { children: ReactNode }) {
    return children;
}
