import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Grocery Terms & Conditions | Pumato",
    description: "Terms and conditions for Pumato grocery delivery service.",
    alternates: {
        canonical: CANONICAL_URLS.termsGrocery,
    },
};

export default function GroceryTermsLayout({ children }: { children: ReactNode }) {
    return children;
}
