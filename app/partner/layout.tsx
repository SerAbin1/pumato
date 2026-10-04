import { CANONICAL_URLS } from "@/lib/seo";
import PartnerLayoutClient from "./PartnerLayoutClient";

export const metadata = {
    title: "Partner Dashboard | Pumato",
    description: "Manage your restaurant orders and menu.",
    alternates: {
        canonical: CANONICAL_URLS.partner,
    },
};

export default function PartnerLayout({ children }) {
    return <PartnerLayoutClient>{children}</PartnerLayoutClient>;
}
