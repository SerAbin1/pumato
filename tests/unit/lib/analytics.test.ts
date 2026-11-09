import { describe, it, expect } from "vite-plus/test";
import {
    normalizeQuery,
    isAnalyticsEventName,
    sanitizeProps,
    sanitizeEvent,
    topN,
    mergeCountMaps,
    createTracker,
} from "../../../lib/analytics";

describe("normalizeQuery", () => {
    it("trims and lowercases", () => {
        expect(normalizeQuery("  Biryani  ")).toBe("biryani");
    });
    it("caps length", () => {
        expect(normalizeQuery("a".repeat(200)).length).toBe(100);
    });
    it("handles null", () => {
        expect(normalizeQuery(null)).toBe("");
    });
});

describe("isAnalyticsEventName", () => {
    it("accepts known events", () => {
        expect(isAnalyticsEventName("search_submitted")).toBe(true);
    });
    it("rejects unknown", () => {
        expect(isAnalyticsEventName("nope")).toBe(false);
    });
});

describe("sanitizeProps", () => {
    it("keeps primitives and caps strings", () => {
        const out = sanitizeProps({ q: "  Hello  ", n: 5, b: true, nil: null, obj: { a: 1 } });
        expect(out).toEqual({ q: "Hello", n: 5, b: true, nil: null });
    });
});

describe("sanitizeEvent", () => {
    it("returns null for unknown event", () => {
        expect(sanitizeEvent({ name: "nope" as never })).toBeNull();
    });
    it("sanitizes valid event", () => {
        const e = sanitizeEvent({ name: "page_view", props: { path: "/x" }, userId: "u1" });
        expect(e?.name).toBe("page_view");
        expect(e?.props).toEqual({ path: "/x" });
        expect(e?.userId).toBe("u1");
    });
});

describe("topN", () => {
    it("sorts descending and slices", () => {
        const items = [{ count: 1 }, { count: 5 }, { count: 3 }];
        expect(topN(items, 2)).toEqual([{ count: 5 }, { count: 3 }]);
    });
});

describe("mergeCountMaps", () => {
    it("sums counts", () => {
        expect(mergeCountMaps([{ a: 1 }, { a: 2, b: 3 }])).toEqual({ a: 3, b: 3 });
    });
});

describe("createTracker", () => {
    it("queues and flushes at batch size", async () => {
        const flushed: any[] = [];
        const tracker = createTracker({
            storage: null,
            doNotTrack: false,
            batchSize: 2,
            flush: async (events) => {
                flushed.push(events);
            },
        });
        tracker.track("page_view", { path: "/" });
        expect(tracker.getQueueSize()).toBe(1);
        tracker.track("page_view", { path: "/2" });
        await new Promise((r) => setTimeout(r, 0));
        expect(flushed.length).toBe(1);
        expect(flushed[0].length).toBe(2);
        expect(tracker.getQueueSize()).toBe(0);
    });

    it("does not track when doNotTrack", () => {
        const tracker = createTracker({ storage: null, doNotTrack: true });
        tracker.track("page_view");
        expect(tracker.getQueueSize()).toBe(0);
    });

    it("requeues on flush failure", async () => {
        const tracker = createTracker({
            storage: null,
            batchSize: 1,
            flush: async () => {
                throw new Error("boom");
            },
        });
        tracker.track("page_view");
        await new Promise((r) => setTimeout(r, 0));
        expect(tracker.getQueueSize()).toBe(1);
    });

    it("persists queue to storage", () => {
        const store: Record<string, string> = {};
        const storage = {
            getItem: (k: string) => store[k] ?? null,
            setItem: (k: string, v: string) => {
                store[k] = v;
            },
            removeItem: (k: string) => {
                delete store[k];
            },
        };
        const tracker = createTracker({ storage, doNotTrack: false, batchSize: 100 });
        tracker.track("page_view", { path: "/x" });
        expect(store.pumato_analytics_queue).toContain("page_view");
    });
});
