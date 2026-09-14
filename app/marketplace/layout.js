import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Marketplace | Pumato",
    description: "Buy, sell, and discover items on campus marketplace.",
    alternates: {
        canonical: CANONICAL_URLS.marketplace,
    },
};

export default function MarketplaceLayout({ children }) {
    return children;
}
