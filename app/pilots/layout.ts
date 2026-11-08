import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Pilot Dashboard | Pumato Rides",
    description: "Go online and take ride requests on Pumato Rides.",
    alternates: {
        canonical: CANONICAL_URLS.ridesPilot,
    },
};

export default function PilotDashboardLayout({ children }: { children: ReactNode }) {
    return children;
}
