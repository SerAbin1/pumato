import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Admin Login | Pumato",
    description: "Sign in to the Pumato admin dashboard.",
    alternates: {
        canonical: CANONICAL_URLS.adminLogin,
    },
};

export default function AdminLoginLayout({ children }: { children: ReactNode }) {
    return children;
}
