import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "My Orders | Pumato",
    description: "View your order history and track deliveries.",
    alternates: {
        canonical: CANONICAL_URLS.orders,
    },
};

export default function OrdersLayout({ children }) {
    return children;
}
