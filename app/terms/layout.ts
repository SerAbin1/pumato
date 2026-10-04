import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Terms & Conditions | Pumato",
    description: "Terms and conditions for Pumato services.",
    alternates: {
        canonical: CANONICAL_URLS.terms,
    },
};

export default function TermsLayout({ children }) {
    return children;
}
