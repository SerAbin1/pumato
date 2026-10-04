import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Delivery Partner | Pumato",
    description: "Pumato delivery partner dashboard",
    alternates: {
        canonical: CANONICAL_URLS.deliveryPartner,
    },
};

export default function DeliveryPartnerLayout({ children }) {
    return children;
}
