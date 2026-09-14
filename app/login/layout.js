import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Sign In | Pumato",
    description: "Sign in to your Pumato account to order food, groceries, and more.",
    alternates: {
        canonical: CANONICAL_URLS.login,
    },
};

export default function LoginLayout({ children }) {
    return children;
}
