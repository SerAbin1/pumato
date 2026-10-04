import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";
import PartnerLayoutClient from "./PartnerLayoutClient";

export const metadata: Metadata = {
    title: "Partner Dashboard | Pumato",
    description: "Manage your restaurant orders and menu.",
    alternates: {
        canonical: CANONICAL_URLS.partner,
    },
};

export default function PartnerLayout({ children }: { children: ReactNode }) {
    return <PartnerLayoutClient>{children}</PartnerLayoutClient>;
}
