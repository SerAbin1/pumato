import { app } from "@/lib/firebase";

// Lazily initialised, browser-only. Loading the module also turns on
// automatic instrumentation (page load timing, First Contentful Paint,
// HTTPS network requests).
let _perfPromise = null;

async function getPerformanceInstance() {
    if (typeof window === "undefined") return null;
    if (!_perfPromise) {
        _perfPromise = import("firebase/performance")
            .then(({ getPerformance }) => getPerformance(app))
            .catch(() => null);
    }
    return _perfPromise;
}

// Call once on app mount so automatic page-load metrics are captured even if
// no custom trace ever runs.
export function initPerformance() {
    getPerformanceInstance().catch(() => {});
}

// Wraps an async operation (e.g. a Firestore read) in a named custom trace.
// Firestore/Cloud Functions calls aren't covered by Performance Monitoring's
// automatic network instrumentation, so this is how we time them.
export async function withTrace(name, fn, attributes = {}) {
    // Set-up (getting the instance, creating/starting the trace) is best-effort
    // and isolated from `fn` so a broken trace can never cause `fn` to run twice.
    let t = null;
    try {
        const perf = await getPerformanceInstance();
        if (perf) {
            const { trace } = await import("firebase/performance");
            t = trace(perf, name);
            Object.entries(attributes).forEach(([key, value]) => {
                if (value !== undefined && value !== null) t.putAttribute(key, String(value));
            });
            t.start();
        }
    } catch {
        t = null;
    }

    try {
        const result = await fn();
        if (t) {
            if (Array.isArray(result)) t.putMetric("count", result.length);
            t.putAttribute("status", "success");
        }
        return result;
    } catch (err) {
        if (t) t.putAttribute("status", "error");
        throw err;
    } finally {
        if (t) {
            try {
                t.stop();
            } catch {
                // ignore
            }
        }
    }
}
