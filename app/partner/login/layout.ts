import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Partner Login | Pumato",
    description: "Sign in to manage your restaurant on Pumato.",
    alternates: {
        canonical: CANONICAL_URLS.partnerLogin,
    },
};

export default function PartnerLoginLayout({ children }: { children: ReactNode }) {
    return children;
}
