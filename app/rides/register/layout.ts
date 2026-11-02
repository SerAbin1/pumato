import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Become a Pilot | Pumato Rides",
    description: "Register as a pilot on Pumato Rides and earn by giving rides on campus.",
    alternates: {
        canonical: CANONICAL_URLS.ridesRegister,
    },
};

export default function PilotRegisterLayout({ children }: { children: ReactNode }) {
    return children;
}
