import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Express Grocery | Pumato",
    description: "Order groceries and essentials delivered to your hostel door.",
    alternates: {
        canonical: CANONICAL_URLS.grocery,
    },
};

export default function GroceryLayout({ children }: { children: ReactNode }) {
    return children;
}
