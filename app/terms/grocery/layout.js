import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Grocery Terms & Conditions | Pumato",
    description: "Terms and conditions for Pumato grocery delivery service.",
    alternates: {
        canonical: CANONICAL_URLS.termsGrocery,
    },
};

export default function GroceryTermsLayout({ children }) {
    return children;
}
