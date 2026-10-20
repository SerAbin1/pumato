import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Become a Rider | Pumato Rides",
    description: "Register as a rider on Pumato Rides and earn by giving rides on campus.",
    alternates: {
        canonical: CANONICAL_URLS.ridesRegister,
    },
};

export default function RiderRegisterLayout({ children }: { children: ReactNode }) {
    return children;
}
