import { describe, it, expect } from "vite-plus/test";
import { riderRef, routeFare, routeKey, telegramUrl, whatsappUrl } from "@/lib/rides";

describe("rider contact links", () => {
    it("builds a wa.me link from a number typed with spaces and a plus", () => {
        expect(whatsappUrl("+91 90480 86503", "hi there")).toBe(
            "https://wa.me/919048086503?text=hi%20there"
        );
    });

    it("builds a t.me link whether or not the username has an @", () => {
        expect(telegramUrl("@pumato", "hi")).toBe("https://t.me/pumato?text=hi");
        expect(telegramUrl("pumato", "hi")).toBe("https://t.me/pumato?text=hi");
    });

    it("gives a rider a short uppercase ref from their uid", () => {
        expect(riderRef("abc123xyz")).toBe("ABC123");
    });
});

describe("route fares", () => {
    it("gives both directions of a route the same key", () => {
        expect(routeKey("gate", "lib")).toBe(routeKey("lib", "gate"));
    });

    it("looks up a priced route either way round", () => {
        const fares = { [routeKey("gate", "lib")]: 20 };
        expect(routeFare(fares, "gate", "lib")).toBe(20);
        expect(routeFare(fares, "lib", "gate")).toBe(20);
    });

    it("returns null for a route with no fare", () => {
        expect(routeFare({}, "gate", "lib")).toBeNull();
    });
});
