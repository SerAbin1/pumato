import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Express Grocery | Pumato",
    description: "Order groceries and essentials delivered to your hostel door.",
    alternates: {
        canonical: CANONICAL_URLS.grocery,
    },
};

export default function GroceryLayout({ children }) {
    return children;
}
