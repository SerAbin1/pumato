import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Admin Login | Pumato",
    description: "Sign in to the Pumato admin dashboard.",
    alternates: {
        canonical: CANONICAL_URLS.adminLogin,
    },
};

export default function AdminLoginLayout({ children }) {
    return children;
}
