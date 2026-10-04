import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Sign In | Pumato",
    description: "Sign in to your Pumato account to order food, groceries, and more.",
    alternates: {
        canonical: CANONICAL_URLS.login,
    },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
    return children;
}
