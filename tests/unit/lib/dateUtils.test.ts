"use strict";

import { describe, it, expect } from "vite-plus/test";
import { formatDateKeyShort } from "../../../lib/dateUtils";

describe("formatDateKeyShort", () => {
    it("formats a mid-month date", () => {
        expect(formatDateKeyShort("2026-08-29")).toBe("Aug 29");
    });

    it("formats the 1st of a month without a leading zero", () => {
        expect(formatDateKeyShort("2026-01-01")).toBe("Jan 1");
    });

    it("formats the last day of December", () => {
        expect(formatDateKeyShort("2026-12-31")).toBe("Dec 31");
    });

    it("formats a single-digit day in March", () => {
        expect(formatDateKeyShort("2026-03-05")).toBe("Mar 5");
    });

    it("returns '' for empty/null input", () => {
        expect(formatDateKeyShort("")).toBe("");
        expect(formatDateKeyShort(null)).toBe("");
    });
});
