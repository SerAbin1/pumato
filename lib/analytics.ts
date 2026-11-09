// Imported lazily in defaultFlush so unit tests can load this module without
// initializing Firebase (which needs env vars).

export const ANALYTICS_EVENTS = [
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

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export interface AnalyticsContext {
    visitorId?: string | null;
    sessionId?: string;
    userId?: string | null;
    campus?: string | null;
}

export interface AnalyticsEvent {
    name: AnalyticsEventName;
    props?: Record<string, unknown>;
    visitorId?: string | null;
    sessionId?: string;
    userId?: string | null;
    campus?: string | null;
    clientTs?: number;
}

export interface TrackerDeps {
    now?: () => number;
    storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
    flush?: (events: AnalyticsEvent[]) => Promise<void>;
    doNotTrack?: boolean;
    maxQueueSize?: number;
    batchSize?: number;
}

const QUEUE_STORAGE_KEY = "pumato_analytics_queue";
const FLUSH_SIZE = 20;
const FLUSH_INTERVAL_MS = 10_000;
const MAX_STRING = 100;

export function normalizeQuery(term: string | null | undefined): string {
    return (term ?? "").trim().toLowerCase().slice(0, MAX_STRING);
}

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
    return typeof value === "string" && (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

export function sanitizeProps(props: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!props) return {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
        if (typeof value === "string") {
            out[key] = value.trim().slice(0, MAX_STRING);
        } else if (typeof value === "number" && Number.isFinite(value)) {
            out[key] = value;
        } else if (typeof value === "boolean") {
            out[key] = value;
        } else if (value === null) {
            out[key] = null;
        }
    }
    return out;
}

export function sanitizeEvent(event: AnalyticsEvent): AnalyticsEvent | null {
    if (!isAnalyticsEventName(event.name)) return null;
    return {
        name: event.name,
        props: sanitizeProps(event.props),
        visitorId: event.visitorId ?? null,
        sessionId: event.sessionId,
        userId: event.userId ?? null,
        campus: event.campus ?? null,
        clientTs: event.clientTs,
    };
}

export function topN<T extends { count: number }>(items: T[], n: number): T[] {
    return [...items].sort((a, b) => b.count - a.count).slice(0, n);
}

export function mergeCountMaps(maps: Record<string, number>[]): Record<string, number> {
    const result: Record<string, number> = {};
    for (const map of maps) {
        for (const [key, value] of Object.entries(map)) {
            result[key] = (result[key] ?? 0) + value;
        }
    }
    return result;
}

export interface Tracker {
    track: (name: AnalyticsEventName, props?: Record<string, unknown>) => void;
    flush: () => Promise<void>;
    setContext: (context: Partial<AnalyticsContext>) => void;
    getContext: () => AnalyticsContext;
    getQueueSize: () => number;
    destroy: () => void;
}

export function createTracker(deps: TrackerDeps = {}): Tracker {
    const now = deps.now ?? (() => Date.now());
    const storage = deps.storage === undefined ? getBrowserStorage() : deps.storage;
    const batchSize = deps.batchSize ?? FLUSH_SIZE;
    const maxQueueSize = deps.maxQueueSize ?? 200;
    const doNotTrack = deps.doNotTrack ?? isDoNotTrack();

    let context: AnalyticsContext = {
        visitorId: getVisitorId(storage),
        sessionId: createSessionId(),
        userId: null,
        campus: null,
    };

    let queue: AnalyticsEvent[] = loadQueue(storage);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function scheduleFlush() {
        if (timer || destroyed) return;
        timer = setTimeout(() => {
            timer = null;
            void flush();
        }, FLUSH_INTERVAL_MS);
    }

    async function flush() {
        if (destroyed || queue.length === 0) return;
        const batch = queue.splice(0, queue.length);
        try {
            const flushFn = deps.flush ?? defaultFlush;
            await flushFn(batch.map((e) => ({ ...e, clientTs: e.clientTs ?? now() })));
            persistQueue(storage, queue);
        } catch {
            queue = [...batch, ...queue].slice(0, maxQueueSize);
            persistQueue(storage, queue);
        }
    }

    function track(name: AnalyticsEventName, props?: Record<string, unknown>) {
        if (destroyed || doNotTrack) return;
        const event = sanitizeEvent({
            name,
            props,
            visitorId: context.visitorId,
            sessionId: context.sessionId,
            userId: context.userId,
            campus: context.campus,
            clientTs: now(),
        });
        if (!event) return;

        queue.push(event);
        if (queue.length > maxQueueSize) {
            queue = queue.slice(queue.length - maxQueueSize);
        }
        persistQueue(storage, queue);

        if (queue.length >= batchSize) {
            void flush();
        } else {
            scheduleFlush();
        }
    }

    function setContext(next: Partial<AnalyticsContext>) {
        context = { ...context, ...next };
        if (next.visitorId !== undefined) context.visitorId = next.visitorId;
    }

    function destroy() {
        destroyed = true;
        if (timer) clearTimeout(timer);
        timer = null;
        void flush();
    }

    return {
        track,
        flush,
        setContext,
        getContext: () => ({ ...context }),
        getQueueSize: () => queue.length,
        destroy,
    };
}

function getBrowserStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> | null {
    try {
        if (typeof window === "undefined") return null;
        return window.localStorage;
    } catch {
        return null;
    }
}

function isDoNotTrack(): boolean {
    try {
        if (typeof navigator === "undefined") return false;
        return navigator.doNotTrack === "1";
    } catch {
        return false;
    }
}

function createSessionId(): string {
    try {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
            return crypto.randomUUID();
        }
    } catch {
        // Fall through.
    }
    return `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getVisitorId(storage: Pick<Storage, "getItem" | "setItem"> | null): string | null {
    if (!storage) return null;
    const key = "pumato_visitor_id";
    try {
        let id = storage.getItem(key);
        if (!id) {
            id = createSessionId();
            storage.setItem(key, id);
        }
        return id;
    } catch {
        return null;
    }
}

function loadQueue(storage: Pick<Storage, "getItem"> | null): AnalyticsEvent[] {
    if (!storage) return [];
    try {
        const raw = storage.getItem(QUEUE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((e) => e && isAnalyticsEventName(e.name))
            .map((e) => sanitizeEvent(e as AnalyticsEvent))
            .filter(Boolean) as AnalyticsEvent[];
    } catch {
        return [];
    }
}

function persistQueue(
    storage: Pick<Storage, "setItem" | "removeItem"> | null,
    queue: AnalyticsEvent[]
) {
    if (!storage) return;
    try {
        if (queue.length === 0) {
            storage.removeItem(QUEUE_STORAGE_KEY);
        } else {
            storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
        }
    } catch {
        // Ignore storage failures (private mode, quota).
    }
}

async function defaultFlush(events: AnalyticsEvent[]) {
    const { trackEvents } = await import("@/lib/functions");
    const { data } = await trackEvents<{ accepted: number }>({ events });
    if (!data || typeof data.accepted !== "number") {
        throw new Error("Unexpected analytics response");
    }
}

let defaultTracker: Tracker | null = null;

export function getTracker(): Tracker {
    if (!defaultTracker) {
        defaultTracker = createTracker();
    }
    return defaultTracker;
}

export function track(name: AnalyticsEventName, props?: Record<string, unknown>) {
    getTracker().track(name, props);
}

export function setAnalyticsContext(context: Partial<AnalyticsContext>) {
    getTracker().setContext(context);
}

export function flushAnalytics() {
    return getTracker().flush();
}

export function destroyAnalytics() {
    if (defaultTracker) {
        defaultTracker.destroy();
        defaultTracker = null;
    }
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
