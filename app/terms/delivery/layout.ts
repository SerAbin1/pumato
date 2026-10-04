import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Food Delivery Terms & Conditions | Pumato",
    description: "Terms and conditions for Pumato food delivery service.",
    alternates: {
        canonical: CANONICAL_URLS.termsDelivery,
    },
};

export default function DeliveryTermsLayout({ children }: { children: ReactNode }) {
    return children;
}
