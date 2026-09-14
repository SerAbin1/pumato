import { CANONICAL_URLS } from "@/lib/seo";

export const metadata = {
    title: "Laundry Service | Pumato",
    description: "Schedule laundry pickup and delivery from your hostel.",
    alternates: {
        canonical: CANONICAL_URLS.laundry,
    },
};

export default function LaundryLayout({ children }) {
    return children;
}
