import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Pumato Rides | Book a Ride on Campus",
    description: "Book a quick ride to anywhere on campus with Pumato Rides.",
    alternates: {
        canonical: CANONICAL_URLS.rides,
    },
};

export default function RidesLayout({ children }: { children: ReactNode }) {
    return children;
}
