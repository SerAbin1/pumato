import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CANONICAL_URLS } from "@/lib/seo";

export const metadata: Metadata = {
    title: "Favourites | Pumato",
    description: "Your saved favourite dishes for quick reordering.",
    alternates: {
        canonical: CANONICAL_URLS.favourites,
    },
};

export default function FavouritesLayout({ children }: { children: ReactNode }) {
    return children;
}
