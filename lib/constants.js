export const COLLECTIONS = {
    RESTAURANTS: "restaurants",
    ORDERS: "orders",
    LAUNDRY_ORDERS: "laundry_orders",
    SITE_CONTENT: "site_content",
    LAUNDRY_SETTINGS: "laundry_settings",
    LAUNDRY_SLOTS: "laundry_slots",
    MARKETPLACE_LISTINGS: "marketplace_listings",
    MARKETPLACE_REQUESTS: "marketplace_requests",
    FCM_TOKENS: "fcm_tokens",
    COUNTERS: "counters",
    USERS: "users",
    PAYMENTS: "payments",
};

export const COUNTER_DOCS = {
    ORDERS: "orders",
};

export const SITE_CONTENT_DOCS = {
    ORDER_SETTINGS: "order_settings",
    PROMO_BANNERS: "promo_banners",
    GROCERY_SETTINGS: "grocery_settings",
    MARKETPLACE_CATEGORIES: "marketplace_categories",
    MARKETPLACE_FILTERS: "marketplace_filters",
    MARKETPLACE_REDIRECT_LINKS: "marketplace_redirect_links",
};

export const LAUNDRY_SETTINGS_DOCS = {
    CAMPUS: "campus",
    PRICING: "pricing",
};

export const DEFAULT_CAMPUS_CONFIG = [
    {
        id: "PU",
        name: "PU",
        deliveryCharge: 0,
        slots: [],
        isPreOrderEnabled: false,
        preOrderSlots: [],
    },
    {
        id: "PTU",
        name: "PTU",
        deliveryCharge: 0,
        slots: [],
        isPreOrderEnabled: false,
        preOrderSlots: [],
    },
    {
        id: "PIMS",
        name: "PIMS",
        deliveryCharge: 0,
        slots: [],
        isPreOrderEnabled: false,
        preOrderSlots: [],
    },
];

export const DEFAULT_GROCERY_CAMPUS_PREORDER = DEFAULT_CAMPUS_CONFIG.map((c) => ({
    id: c.id,
    isPreOrderEnabled: false,
    preOrderSlots: [],
}));

export const MARKETPLACE_CATEGORIES = [
    "Electronics",
    "Furniture",
    "Books & Stationery",
    "Vehicles",
    "Clothing & Accessories",
    "Sports & Fitness",
    "Home & Kitchen",
    "Other",
];
