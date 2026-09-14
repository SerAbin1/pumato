import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Food Delivery | Pumato",
    description: "Browse restaurants and order food delivered to your hostel.",
    alternates: {
        canonical: CANONICAL_URLS.delivery,
    },
};

export default function DeliveryLayout({ children }) {
    return children;
}
