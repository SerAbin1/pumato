import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Rider Dashboard | Pumato Rides",
    description: "Go online and take ride requests on Pumato Rides.",
    alternates: {
        canonical: CANONICAL_URLS.ridesRider,
    },
};

export default function RiderDashboardLayout({ children }: { children: ReactNode }) {
    return children;
}
