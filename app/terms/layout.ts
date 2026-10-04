import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Terms & Conditions | Pumato",
    description: "Terms and conditions for Pumato services.",
    alternates: {
        canonical: CANONICAL_URLS.terms,
    },
};

export default function TermsLayout({ children }: { children: ReactNode }) {
    return children;
}
