import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { IST_TIME_ZONE, DAY_MS, startOfIstDay } from "./ist";

const ALLOWED_EVENTS = [
    "page_view",
    "search_submitted",
    "search_result_clicked",
    "recent_search_clicked",
    "trending_section_viewed",
    "trending_item_clicked",
    "promo_impression",
    "promo_clicked",
    "restaurant_viewed",
    "add_to_cart",
] as const;

const MAX_STRING = 100;

function cleanString(value: unknown): string {
    if (typeof value !== "string") return "";
    return value.trim().slice(0, MAX_STRING);
}

function cleanNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function cleanProps(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === "string") out[key] = cleanString(value);
        else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
        else if (typeof value === "boolean") out[key] = value;
        else if (value === null) out[key] = null;
    }
    return out;
}

export function sanitizeEventInput(raw: unknown): Record<string, unknown> | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const r = raw as Record<string, unknown>;
    const name = cleanString(r.name);
    if (!ALLOWED_EVENTS.includes(name as (typeof ALLOWED_EVENTS)[number])) return null;

    return {
        name,
        props: cleanProps(r.props),
        visitorId: typeof r.visitorId === "string" ? cleanString(r.visitorId) : null,
        sessionId: typeof r.sessionId === "string" ? cleanString(r.sessionId) : null,
        userId: typeof r.userId === "string" ? cleanString(r.userId) : null,
        campus: typeof r.campus === "string" ? cleanString(r.campus) : null,
        clientTs: cleanNumber(r.clientTs),
    };
}

export const trackEvents = onCall(async (request) => {
    const rawEvents = (request.data as { events?: unknown })?.events;
    if (!Array.isArray(rawEvents)) {
        throw new HttpsError("invalid-argument", "events must be an array");
    }

    const events = rawEvents
        .slice(0, 50)
        .map(sanitizeEventInput)
        .filter((e): e is Record<string, unknown> => e !== null);

    if (events.length === 0) return { accepted: 0 };

    const db = getFirestore();
    const batch = db.batch();
    const col = db.collection("analytics_events");
    for (const event of events) {
        const ref = col.doc();
        batch.set(ref, {
            ...event,
            ts: FieldValue.serverTimestamp(),
        });
    }
    await batch.commit();
    return { accepted: events.length };
});

interface CountEntry {
    key: string;
    count: number;
}

function topFromMap(map: Map<string, number>, n: number): CountEntry[] {
    return [...map.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, n);
}

export interface DailyRollup {
    date: string;
    searches: {
        total: number;
        uniqueVisitors: number;
        byScope: { global: number; restaurant_menu: number };
    };
    topSearchTerms: { term: string; count: number }[];
    topSearchedRestaurants: { restaurantId: string; name: string; count: number }[];
    zeroResultSearches: { term: string; count: number }[];
    trending: {
        sectionViews: number;
        clicks: number;
        byItem: { restaurantId: string; itemId: string; count: number }[];
    };
    promos: {
        impressions: number;
        clicks: number;
        ctr: number;
        byListing: { listingId: string; impressions: number; clicks: number; ctr: number }[];
    };
    restaurantViews: {
        restaurantId: string;
        name: string;
        count: number;
        bySource: Record<string, number>;
    }[];
}

export function aggregateEvents(events: Record<string, unknown>[], date: string): DailyRollup {
    const uniqueVisitors = new Set<string>();
    let searchesTotal = 0;
    const byScope = { global: 0, restaurant_menu: 0 };
    const searchTermCounts = new Map<string, number>();
    const searchedRestaurants = new Map<string, { name: string; count: number }>();
    const zeroResultCounts = new Map<string, number>();

    let trendingSectionViews = 0;
    const trendingClicks = new Map<string, number>();

    let promoImpressions = 0;
    let promoClicks = 0;
    const promoByListing = new Map<string, { impressions: number; clicks: number }>();

    const restaurantViews = new Map<
        string,
        { name: string; count: number; bySource: Record<string, number> }
    >();

    for (const event of events) {
        const visitorKey =
            (typeof event.visitorId === "string" && event.visitorId) ||
            (typeof event.sessionId === "string" && event.sessionId) ||
            "";
        if (visitorKey) uniqueVisitors.add(visitorKey);

        const props = (event.props && typeof event.props === "object" ? event.props : {}) as Record<
            string,
            unknown
        >;
        const name = asString(event.name);

        switch (name) {
            case "search_submitted": {
                searchesTotal += 1;
                const scope = asString(props.scope);
                if (scope === "global" || scope === "restaurant_menu") {
                    byScope[scope] += 1;
                }
                const query = cleanString(asString(props.query));
                if (query) {
                    searchTermCounts.set(query, (searchTermCounts.get(query) ?? 0) + 1);
                }
                const resultCount =
                    typeof props.resultCount === "number" ? props.resultCount : null;
                if (query && resultCount === 0) {
                    zeroResultCounts.set(query, (zeroResultCounts.get(query) ?? 0) + 1);
                }
                const rid = cleanString(asString(props.restaurantId));
                if (rid) {
                    const cur = searchedRestaurants.get(rid) ?? { name: "", count: 0 };
                    cur.count += 1;
                    searchedRestaurants.set(rid, cur);
                }
                break;
            }
            case "trending_section_viewed": {
                trendingSectionViews += 1;
                break;
            }
            case "trending_item_clicked": {
                const key = `${cleanString(asString(props.restaurantId))}:${cleanString(asString(props.itemId))}`;
                trendingClicks.set(key, (trendingClicks.get(key) ?? 0) + 1);
                break;
            }
            case "promo_impression": {
                promoImpressions += 1;
                const lid = cleanString(asString(props.listingId));
                if (lid) {
                    const cur = promoByListing.get(lid) ?? { impressions: 0, clicks: 0 };
                    cur.impressions += 1;
                    promoByListing.set(lid, cur);
                }
                break;
            }
            case "promo_clicked": {
                promoClicks += 1;
                const lid = cleanString(asString(props.listingId));
                if (lid) {
                    const cur = promoByListing.get(lid) ?? { impressions: 0, clicks: 0 };
                    cur.clicks += 1;
                    promoByListing.set(lid, cur);
                }
                break;
            }
            case "restaurant_viewed": {
                const rid = cleanString(asString(props.restaurantId));
                if (!rid) break;
                const source = cleanString(asString(props.source) || "unknown");
                const cur = restaurantViews.get(rid) ?? {
                    name: "",
                    count: 0,
                    bySource: {},
                };
                cur.count += 1;
                cur.bySource[source] = (cur.bySource[source] ?? 0) + 1;
                restaurantViews.set(rid, cur);
                break;
            }
            default:
                break;
        }
    }

    const topSearchTerms = topFromMap(searchTermCounts, 50).map((e) => ({
        term: e.key,
        count: e.count,
    }));

    const topSearchedRestaurants = [...searchedRestaurants.entries()]
        .map(([restaurantId, v]) => ({ restaurantId, name: v.name, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

    const zeroResultSearches = topFromMap(zeroResultCounts, 20).map((e) => ({
        term: e.key,
        count: e.count,
    }));

    const trendingByItem = [...trendingClicks.entries()]
        .map(([key, count]) => {
            const [restaurantId, itemId] = key.split(":");
            return { restaurantId, itemId, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

    const promoByListingOut = [...promoByListing.entries()]
        .map(([listingId, v]) => ({
            listingId,
            impressions: v.impressions,
            clicks: v.clicks,
            ctr: v.impressions > 0 ? v.clicks / v.impressions : 0,
        }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 50);

    const restaurantViewsOut = [...restaurantViews.entries()]
        .map(([restaurantId, v]) => ({
            restaurantId,
            name: v.name,
            count: v.count,
            bySource: v.bySource,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

    return {
        date,
        searches: {
            total: searchesTotal,
            uniqueVisitors: uniqueVisitors.size,
            byScope,
        },
        topSearchTerms,
        topSearchedRestaurants,
        zeroResultSearches,
        trending: {
            sectionViews: trendingSectionViews,
            clicks: [...trendingClicks.values()].reduce((a, b) => a + b, 0),
            byItem: trendingByItem,
        },
        promos: {
            impressions: promoImpressions,
            clicks: promoClicks,
            ctr: promoImpressions > 0 ? promoClicks / promoImpressions : 0,
            byListing: promoByListingOut,
        },
        restaurantViews: restaurantViewsOut,
    };
}

function istDateStr(date: Date): string {
    return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export const aggregateAnalyticsDaily = onSchedule(
    { schedule: "every day 01:00", timeZone: IST_TIME_ZONE },
    async () => {
        const db = getFirestore();
        const now = new Date();
        const dayStart = startOfIstDay(now);
        const prevStart = new Date(dayStart.getTime() - DAY_MS);
        const prevEnd = dayStart;
        const dateStr = istDateStr(prevStart);

        const snap = await db
            .collection("analytics_events")
            .where("ts", ">=", Timestamp.fromDate(prevStart))
            .where("ts", "<", Timestamp.fromDate(prevEnd))
            .get();

        const events = snap.docs.map((d) => d.data() as Record<string, unknown>);
        const rollup = aggregateEvents(events, dateStr);
        await db.collection("analytics_daily").doc(dateStr).set(rollup, { merge: true });
    }
);
