import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Favourites | Pumato",
    description: "Your saved favourite dishes for quick reordering.",
    alternates: {
        canonical: CANONICAL_URLS.favourites,
    },
};

export default function FavouritesLayout({ children }) {
    return children;
}
