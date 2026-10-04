import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Post on Marketplace | Pumato",
    description: "Create a listing to sell items, find roommates, or post opportunities.",
    alternates: {
        canonical: CANONICAL_URLS.marketplaceSell,
    },
};

export default function MarketplaceSellLayout({ children }) {
    return children;
}
