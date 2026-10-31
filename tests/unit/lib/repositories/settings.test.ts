import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
    onSnapshot: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: { __db: true } }));
vi.mock("firebase/firestore", () => ({
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
    collection: (_db: unknown, name: string) => ({ collection: name }),
    onSnapshot: mocks.onSnapshot,
    getDoc: vi.fn(),
    setDoc: vi.fn(),
}));

const { subscribeOrderSettings, subscribeGrocerySettings } =
    await import("@/lib/repositories/siteContent");
const { subscribeLaundrySlots } = await import("@/lib/repositories/settings");

const lastRef = () => mocks.onSnapshot.mock.calls.at(-1)![0];
const lastListener = () => mocks.onSnapshot.mock.calls.at(-1)![1];

beforeEach(() => {
    vi.clearAllMocks();
});

describe("subscribeOrderSettings", () => {
    it("follows site_content/order_settings and defaults the campus config", () => {
        const onChange = vi.fn();
        subscribeOrderSettings(onChange);
        expect(lastRef()).toEqual({ path: "site_content/order_settings" });

        lastListener()({ exists: () => true, data: () => ({ whatsappNumber: "1" }) });
        expect(onChange).toHaveBeenCalledWith({ whatsappNumber: "1", deliveryCampusConfig: [] });
    });

    it("leaves the current settings alone until the doc exists", () => {
        const onChange = vi.fn();
        subscribeOrderSettings(onChange);
        lastListener()({ exists: () => false });
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe("subscribeGrocerySettings", () => {
    it("follows site_content/grocery_settings", () => {
        const onChange = vi.fn();
        subscribeGrocerySettings(onChange);
        expect(lastRef()).toEqual({ path: "site_content/grocery_settings" });

        lastListener()({ exists: () => true, data: () => ({ whatsappNumber: "2" }) });
        expect(onChange).toHaveBeenCalledWith({ whatsappNumber: "2" });
    });
});

describe("subscribeLaundrySlots", () => {
    it("follows a day's slots, defaulting to none", () => {
        const onChange = vi.fn();
        subscribeLaundrySlots("default", onChange);
        expect(lastRef()).toEqual({ path: "laundry_slots/default" });

        lastListener()({ exists: () => false });
        expect(onChange).toHaveBeenCalledWith({ slots: [] });
    });

    it("hands over the saved slots", () => {
        const onChange = vi.fn();
        subscribeLaundrySlots("default", onChange);
        lastListener()({ exists: () => true, data: () => ({ slots: ["08:00 - 10:00"] }) });
        expect(onChange).toHaveBeenCalledWith({ slots: ["08:00 - 10:00"] });
    });
});
