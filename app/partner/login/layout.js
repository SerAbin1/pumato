import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Partner Login | Pumato",
    description: "Sign in to manage your restaurant on Pumato.",
    alternates: {
        canonical: CANONICAL_URLS.partnerLogin,
    },
};

export default function PartnerLoginLayout({ children }) {
    return children;
}
