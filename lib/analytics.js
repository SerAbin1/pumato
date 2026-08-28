import { app } from "@/lib/firebase";

// Lazily initialised, browser-only, and a no-op if the measurement ID isn't
// configured (e.g. .env.test) or the browser doesn't support it.
let _analyticsPromise = null;

async function getAnalyticsInstance() {
    if (typeof window === "undefined") return null;
    if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return null;

    if (!_analyticsPromise) {
        _analyticsPromise = import("firebase/analytics").then(
            async ({ getAnalytics, isSupported }) => {
                const supported = await isSupported();
                if (!supported) return null;
                return getAnalytics(app);
            }
        );
    }
    return _analyticsPromise;
}

// Call once on app mount so session/engagement tracking starts even if the
// visitor never triggers a custom event (e.g. they just browse and leave).
export function initAnalytics() {
    getAnalyticsInstance().catch(() => {});
}

export async function trackEvent(name, params = {}) {
    try {
        const analytics = await getAnalyticsInstance();
        if (!analytics) return;
        const { logEvent } = await import("firebase/analytics");
        logEvent(analytics, name, params);
    } catch {
        // Analytics must never break the app.
    }
}

export function trackSearch(term, { resultsCount, source } = {}) {
    const trimmed = term?.trim();
    if (!trimmed) return;
    trackEvent("search", { search_term: trimmed, results_count: resultsCount, source });
}

const toGaItem = (item, quantity) => ({
    item_id: item.id,
    item_name: item.name,
    item_category: item.category,
    price: Number(item.unitPrice ?? item.price ?? 0),
    quantity,
});

export function trackAddToCart(item, quantityDelta = 1) {
    if (quantityDelta > 0) {
        trackEvent("add_to_cart", {
            currency: "INR",
            value: Number(item.unitPrice ?? item.price ?? 0) * quantityDelta,
            items: [toGaItem(item, quantityDelta)],
        });
    } else if (quantityDelta < 0) {
        trackEvent("remove_from_cart", {
            currency: "INR",
            value: Number(item.unitPrice ?? item.price ?? 0) * -quantityDelta,
            items: [toGaItem(item, -quantityDelta)],
        });
    }
}

export function trackPurchase(orderId, { items = [], value, restaurantIds } = {}) {
    trackEvent("purchase", {
        transaction_id: orderId,
        currency: "INR",
        value,
        items: items.map((i) => toGaItem(i, i.quantity)),
        restaurant_ids: restaurantIds,
    });
}
