/**
 * Pure helpers for deciding whether an online rider has gone inactive. No
 * Firebase imports, so they can be unit-tested directly.
 */

/** 30 minutes of inactivity marks a rider offline. */
export const INACTIVE_THRESHOLD_MS = 30 * 60 * 1000;

/** 7 minutes between client heartbeats. */
export const HEARTBEAT_MIN_MS = 7 * 60 * 1000;

/** Coerce a Firestore Timestamp / Date / number / null into epoch ms. */
export function toMillis(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value instanceof Date) {
        const t = value.getTime();
        return Number.isFinite(t) ? t : null;
    }
    const v = value as { toMillis?: () => number; toDate?: () => Date };
    if (typeof v.toMillis === "function") {
        try {
            const t = v.toMillis();
            return Number.isFinite(t) ? t : null;
        } catch {
            return null;
        }
    }
    if (typeof v.toDate === "function") {
        try {
            const d = v.toDate();
            const t = d instanceof Date ? d.getTime() : NaN;
            return Number.isFinite(t) ? t : null;
        } catch {
            return null;
        }
    }
    return null;
}

/** The last activity time of a rider, preferring `lastActiveAt`, falling back to `updatedAt`. */
export function riderLastActiveMs(rider: {
    lastActiveAt?: unknown;
    updatedAt?: unknown;
}): number | null {
    return toMillis(rider.lastActiveAt) ?? toMillis(rider.updatedAt);
}

/** Whether an approved, online rider should be marked offline for inactivity. */
export function isInactiveRider(
    rider: {
        status?: string;
        online?: boolean;
        lastActiveAt?: unknown;
        updatedAt?: unknown;
    },
    now: Date,
    thresholdMs: number = INACTIVE_THRESHOLD_MS
): boolean {
    if (rider.status !== "approved" || rider.online !== true) return false;
    const last = riderLastActiveMs(rider);
    if (last === null) return false;
    return now.getTime() - last > thresholdMs;
}
