export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pumato.online";

export function getCanonicalUrl(path = "") {
    const base = SITE_URL.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    if (cleanPath === "/") return `${base}/`;
    return `${base}${cleanPath}/`;
}

export const CANONICAL_URLS = {
    home: getCanonicalUrl("/"),
    delivery: getCanonicalUrl("/delivery"),
    grocery: getCanonicalUrl("/grocery"),
    laundry: getCanonicalUrl("/laundry"),
    marketplace: getCanonicalUrl("/marketplace"),
    marketplaceSell: getCanonicalUrl("/marketplace/sell"),
    orders: getCanonicalUrl("/orders"),
    favourites: getCanonicalUrl("/favourites"),
    login: getCanonicalUrl("/login"),
    terms: getCanonicalUrl("/terms"),
    termsDelivery: getCanonicalUrl("/terms/delivery"),
    termsGrocery: getCanonicalUrl("/terms/grocery"),
    termsLaundry: getCanonicalUrl("/terms/laundry"),
    admin: getCanonicalUrl("/admin"),
    adminAnalytics: getCanonicalUrl("/admin/analytics"),
    adminLogin: getCanonicalUrl("/admin/login"),
    partner: getCanonicalUrl("/partner"),
    partnerLogin: getCanonicalUrl("/partner/login"),
    deliveryPartner: getCanonicalUrl("/delivery-partner"),
    foodMarketing: getCanonicalUrl("/food-marketing"),
};
