import { describe, it, expect } from "vite-plus/test";
import {
    INACTIVE_THRESHOLD_MS,
    toMillis,
    riderLastActiveMs,
    isInactiveRider,
} from "../../../functions/src/rider-inactivity";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const ts = (ms: number) => ({ toMillis: () => ms });
const ago = (mins: number) => new Date(NOW.getTime() - mins * 60 * 1000);

describe("toMillis", () => {
    it("handles null/undefined", () => {
        expect(toMillis(null)).toBeNull();
        expect(toMillis(undefined)).toBeNull();
    });
    it("handles numbers", () => {
        expect(toMillis(1234)).toBe(1234);
        expect(toMillis(NaN)).toBeNull();
    });
    it("handles Date", () => {
        const d = new Date(5000);
        expect(toMillis(d)).toBe(5000);
    });
    it("handles Timestamp-like with toMillis", () => {
        expect(toMillis(ts(999))).toBe(999);
    });
    it("handles Timestamp-like with toDate", () => {
        const d = new Date(7777);
        expect(toMillis({ toDate: () => d })).toBe(7777);
    });
});

describe("riderLastActiveMs", () => {
    it("prefers lastActiveAt", () => {
        expect(riderLastActiveMs({ lastActiveAt: ts(100), updatedAt: ts(50) })).toBe(100);
    });
    it("falls back to updatedAt", () => {
        expect(riderLastActiveMs({ updatedAt: ts(50) })).toBe(50);
    });
    it("returns null when neither present", () => {
        expect(riderLastActiveMs({})).toBeNull();
    });
});

describe("isInactiveRider", () => {
    const base = { status: "approved", online: true, lastActiveAt: ts(NOW.getTime()) };

    it("false for non-approved", () => {
        expect(isInactiveRider({ ...base, status: "pending" }, NOW)).toBe(false);
    });
    it("false when offline", () => {
        expect(isInactiveRider({ ...base, online: false }, NOW)).toBe(false);
    });
    it("false when no timestamp", () => {
        expect(isInactiveRider({ status: "approved", online: true }, NOW)).toBe(false);
    });
    it("false within 30 min", () => {
        expect(isInactiveRider({ ...base, lastActiveAt: ts(ago(29).getTime()) }, NOW)).toBe(false);
    });
    it("false at exactly 30 min (strict >)", () => {
        expect(isInactiveRider({ ...base, lastActiveAt: ts(ago(30).getTime()) }, NOW)).toBe(false);
    });
    it("true after 30 min", () => {
        expect(isInactiveRider({ ...base, lastActiveAt: ts(ago(31).getTime()) }, NOW)).toBe(true);
    });
    it("uses updatedAt fallback", () => {
        expect(
            isInactiveRider(
                { status: "approved", online: true, updatedAt: ts(ago(45).getTime()) },
                NOW
            )
        ).toBe(true);
    });
    it("respects custom threshold", () => {
        expect(
            isInactiveRider({ ...base, lastActiveAt: ts(ago(10).getTime()) }, NOW, 5 * 60 * 1000)
        ).toBe(true);
    });
});

describe("constants", () => {
    it("threshold is 30 min", () => {
        expect(INACTIVE_THRESHOLD_MS).toBe(30 * 60 * 1000);
    });
});
