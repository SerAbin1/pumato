import { describe, it, expect } from "vite-plus/test";
import { isIOS, unblockSteps } from "@/lib/notificationHelp";

const UA = {
    iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    ipadOS: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    androidChrome:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    desktopChrome:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
    firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
    androidFirefox: "Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0",
    macSafari:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
};

describe("isIOS", () => {
    it("spots iPhones, and iPads that report themselves as a Mac", () => {
        expect(isIOS(UA.iphone, 5)).toBe(true);
        expect(isIOS(UA.ipadOS, 5)).toBe(true);
    });

    it("leaves Macs and Android alone", () => {
        expect(isIOS(UA.macSafari, 0)).toBe(false);
        expect(isIOS(UA.androidChrome, 5)).toBe(false);
    });
});

describe("unblockSteps", () => {
    it("points iPhone home-screen apps to the iOS Settings app", () => {
        expect(unblockSteps(UA.iphone, 5)).toMatch(/Settings app → Notifications/);
    });

    it("walks Chrome on Android through the page's permissions", () => {
        expect(unblockSteps(UA.androidChrome, 5)).toMatch(
            /icon left of the address → Permissions → Notifications → Allow/
        );
    });

    it("walks desktop Chrome and Edge through site settings", () => {
        expect(unblockSteps(UA.desktopChrome, 0)).toMatch(/Site settings → Notifications → Allow/);
        expect(unblockSteps(UA.edge, 0)).toMatch(/Site settings|Site permissions/);
    });

    it("tells Firefox users to clear the block", () => {
        expect(unblockSteps(UA.firefox, 0)).toMatch(/Blocked/);
        expect(unblockSteps(UA.androidFirefox, 5)).toMatch(/Blocked|Permissions/);
    });

    it("sends Safari on a Mac to its Websites settings", () => {
        expect(unblockSteps(UA.macSafari, 0)).toMatch(
            /Safari → Settings → Websites → Notifications/
        );
    });
});
