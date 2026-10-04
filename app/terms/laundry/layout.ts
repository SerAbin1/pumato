import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Laundry Terms & Conditions | Pumato",
    description: "Terms and conditions for Pumato laundry pickup and delivery service.",
    alternates: {
        canonical: CANONICAL_URLS.termsLaundry,
    },
};

export default function LaundryTermsLayout({ children }: { children: ReactNode }) {
    return children;
}
