import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Laundry Service | Pumato",
    description: "Schedule laundry pickup and delivery from your hostel.",
    alternates: {
        canonical: CANONICAL_URLS.laundry,
    },
};

export default function LaundryLayout({ children }: { children: ReactNode }) {
    return children;
}
