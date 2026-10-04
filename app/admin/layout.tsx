import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";
import { AdminAuthProvider } from "@/app/context/AdminAuthContext";

export const metadata: Metadata = {
    title: "Admin Dashboard | Pumato",
    description: "Manage restaurants, orders, coupons, and settings.",
    alternates: {
        canonical: CANONICAL_URLS.admin,
    },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
    return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
