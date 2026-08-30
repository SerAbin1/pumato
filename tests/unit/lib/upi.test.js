"use strict";

import { describe, it, expect } from "vitest";
import {
    buildUpiLink,
    isValidVpa,
    isValidTransactionId,
    normalizeTransactionId,
    paymentReference,
} from "../../../lib/upi";

/** Parses a upi://pay link's query so assertions read as intent, not string matching. */
const params = (link) => Object.fromEntries(new URLSearchParams(link.split("?")[1]));

describe("isValidVpa", () => {
    it("accepts the handles people actually use", () => {
        for (const vpa of [
            "pumato@okhdfcbank",
            "9876543210@paytm",
            "sonu.kumar@ybl",
            "shop-1@axl",
            "a_b@upi",
        ]) {
            expect(isValidVpa(vpa)).toBe(true);
        }
    });

    it("rejects anything that isn't name@handle", () => {
        for (const bad of [
            "",
            null,
            undefined,
            "nohandle",
            "@ybl",
            "name@",
            "name@123",
            "a b@ybl",
        ]) {
            expect(isValidVpa(bad)).toBe(false);
        }
    });

    it("tolerates surrounding whitespace", () => {
        expect(isValidVpa("  pumato@okhdfcbank  ")).toBe(true);
    });
});

describe("paymentReference", () => {
    it("strips the order number to alphanumerics for the UPI `tr` field", () => {
        expect(paymentReference("ORD-0423")).toBe("ORD0423");
        expect(paymentReference("ORD-10000")).toBe("ORD10000");
    });

    it("is empty when there's no order number", () => {
        expect(paymentReference(undefined)).toBe("");
        expect(paymentReference("")).toBe("");
    });
});

describe("buildUpiLink", () => {
    const base = {
        vpa: "pumato@okhdfcbank",
        payeeName: "Pumato",
        amount: 380,
        orderNumber: "ORD-0423",
    };

    it("builds a pay intent with the payee, amount and currency", () => {
        const p = params(buildUpiLink(base));

        expect(buildUpiLink(base).startsWith("upi://pay?")).toBe(true);
        expect(p.pa).toBe("pumato@okhdfcbank");
        expect(p.pn).toBe("Pumato");
        expect(p.am).toBe("380.00");
        expect(p.cu).toBe("INR");
    });

    it("carries the order number as the merchant reference", () => {
        // So a payment can be matched to an order by eye in the statement.
        expect(params(buildUpiLink(base)).tr).toBe("ORD0423");
        expect(params(buildUpiLink(base)).tn).toContain("ORD0423");
    });

    it("always sends two decimal places", () => {
        expect(params(buildUpiLink({ ...base, amount: 380.5 })).am).toBe("380.50");
        expect(params(buildUpiLink({ ...base, amount: 7 })).am).toBe("7.00");
        expect(params(buildUpiLink({ ...base, amount: "42" })).am).toBe("42.00");
    });

    it("refuses to build a link with no usable amount", () => {
        // A zero or missing amount opens the UPI app asking the customer to
        // type their own figure — worse than showing no Pay button.
        for (const amount of [0, -50, null, undefined, "abc", NaN, Infinity]) {
            expect(buildUpiLink({ ...base, amount })).toBeNull();
        }
    });

    it("refuses to build a link without a valid payee", () => {
        expect(buildUpiLink({ ...base, vpa: "" })).toBeNull();
        expect(buildUpiLink({ ...base, vpa: "not-a-vpa" })).toBeNull();
        expect(buildUpiLink()).toBeNull();
    });

    it("falls back to a payee name rather than sending an empty one", () => {
        expect(params(buildUpiLink({ ...base, payeeName: "" })).pn).toBe("Pumato");
    });

    it("works without an order number", () => {
        const p = params(buildUpiLink({ ...base, orderNumber: undefined }));

        expect(p.tr).toBeUndefined();
        expect(p.tn).toBe("Pumato order");
    });

    it("escapes values instead of breaking the query", () => {
        const p = params(buildUpiLink({ ...base, payeeName: "Pumato & Co", note: "a=b&c=d" }));

        expect(p.pn).toBe("Pumato & Co");
        expect(p.tn).toBe("a=b&c=d");
    });
});

describe("transaction ids", () => {
    it("normalises to trimmed uppercase", () => {
        expect(normalizeTransactionId("  abc123def456 ")).toBe("ABC123DEF456");
        expect(normalizeTransactionId(null)).toBe("");
    });

    it("accepts the reference formats the UPI apps show", () => {
        expect(isValidTransactionId("412345678901")).toBe(true); // 12-digit UTR
        expect(isValidTransactionId("T2408301234567890123")).toBe(true); // PhonePe style
        expect(isValidTransactionId("  412345678901  ")).toBe(true);
    });

    it("rejects input that can't be a reference", () => {
        for (const bad of [
            "",
            null,
            undefined,
            "123",
            "1234567",
            "abc-123-def",
            "4123 4567 8901",
        ]) {
            expect(isValidTransactionId(bad)).toBe(false);
        }
    });

    it("rejects something longer than any real reference", () => {
        expect(isValidTransactionId("A".repeat(36))).toBe(false);
        expect(isValidTransactionId("A".repeat(35))).toBe(true);
    });
});
