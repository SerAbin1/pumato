import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Laundry Terms & Conditions | Pumato",
    description: "Terms and conditions for Pumato laundry pickup and delivery service.",
    alternates: {
        canonical: CANONICAL_URLS.termsLaundry,
    },
};

export default function LaundryTermsLayout({ children }) {
    return children;
}
