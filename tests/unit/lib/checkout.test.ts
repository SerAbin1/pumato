import { describe, it, expect } from "vite-plus/test";
import {
    isDirectCart,
    planCheckout,
    classifyCheckoutError,
    DUPLICATE_ORDER_WINDOW_MS,
} from "../../../lib/checkout";
import { getSharedPreOrderSlots } from "../../../lib/preOrderSlots";
import type { CheckoutInput } from "../../../lib/checkout";

const NOW = { year: 2026, month: 9, day: 22, timeInMinutes: 600 }; // 10:00 AM
const SLOT_DEFS = [{ start: "13:00", end: "14:00", cutoffMinutes: 60 }];
const [SLOT] = getSharedPreOrderSlots([SLOT_DEFS], NOW);

const details = {
    name: "  Asha  ",
    phone: "9876543210",
    campus: "north",
    address: "  Hostel B  ",
    instructions: "",
};

const input = (over: Partial<CheckoutInput> = {}): CheckoutInput => ({
    cartItemCount: 2,
    userDetails: details,
    requiresSlot: false,
    selectedSlot: null,
    groupSlotDefs: [],
    now: NOW,
    campusPreOrder: { enabled: false },
    isDirectFlow: false,
    isSignedIn: false,
    couponCode: "",
    lastOrder: null,
    nowMs: 1_000_000,
    ...over,
});

describe("isDirectCart", () => {
    const restaurants = [
        { id: "a", isPaymentPartner: true },
        { id: "b", isPaymentPartner: true },
        { id: "c", isPaymentPartner: false },
        { id: "d" },
    ];

    it("is direct when every restaurant in the cart is a payment partner", () => {
        expect(isDirectCart([{ restaurantId: "a" }, { restaurantId: "b" }], restaurants)).toBe(
            true
        );
    });

    it("counts each restaurant once however many lines it has", () => {
        expect(isDirectCart([{ restaurantId: "a" }, { restaurantId: "a" }], restaurants)).toBe(
            true
        );
    });

    it("is not direct when any restaurant is not a payment partner", () => {
        expect(isDirectCart([{ restaurantId: "a" }, { restaurantId: "c" }], restaurants)).toBe(
            false
        );
        expect(isDirectCart([{ restaurantId: "d" }], restaurants)).toBe(false);
    });

    it("is not direct when a restaurant is unknown", () => {
        expect(isDirectCart([{ restaurantId: "zz" }], restaurants)).toBe(false);
    });

    it("is not direct for an empty cart", () => {
        expect(isDirectCart([], restaurants)).toBe(false);
    });

    it("ignores lines without a restaurant", () => {
        expect(isDirectCart([{ restaurantId: "a" }, {}], restaurants)).toBe(true);
        expect(isDirectCart([{}, { restaurantId: "" }], restaurants)).toBe(false);
    });
});

describe("planCheckout — validation", () => {
    it("rejects an empty cart before anything else", () => {
        expect(
            planCheckout(input({ cartItemCount: 0, userDetails: { ...details, name: "" } }))
        ).toEqual({
            kind: "invalid",
            error: "Your cart is empty. Please add items before checking out.",
            clearSlot: false,
        });
    });

    const missing = "Please fill in all details including Campus and Hostel.";

    it.each([
        ["name", { name: "" }],
        ["whitespace-only name", { name: "   " }],
        ["phone", { phone: "" }],
        ["campus", { campus: "" }],
        ["address", { address: "" }],
        ["whitespace-only address", { address: "  \t " }],
    ])("rejects a missing %s", (_, over) => {
        expect(planCheckout(input({ userDetails: { ...details, ...over } }))).toEqual({
            kind: "invalid",
            error: missing,
            clearSlot: false,
        });
    });

    it("does not require instructions", () => {
        expect(planCheckout(input()).kind).toBe("place");
    });

    it.each(["987654321", "98765432100", "+919876543210"])(
        "rejects phone %j that isn't 10 characters long",
        (phone) => {
            expect(planCheckout(input({ userDetails: { ...details, phone } }))).toEqual({
                kind: "invalid",
                error: "Please enter a valid 10-digit phone number.",
                clearSlot: false,
            });
        }
    );

    it.each(["abcdefghij", "98765 4321"])("checks only the length of phone %j", (phone) => {
        expect(planCheckout(input({ userDetails: { ...details, phone } })).kind).toBe("place");
    });

    it("reports missing details before a bad phone", () => {
        const plan = planCheckout(input({ userDetails: { ...details, phone: "1", name: "" } }));
        expect(plan).toMatchObject({ error: missing });
    });

    it("asks for a slot when one is required and none is picked", () => {
        expect(planCheckout(input({ requiresSlot: true, groupSlotDefs: [SLOT_DEFS] }))).toEqual({
            kind: "invalid",
            error: "Please select a delivery time slot.",
            clearSlot: false,
        });
    });

    it("reports a bad phone before a missing slot", () => {
        const plan = planCheckout(
            input({ requiresSlot: true, userDetails: { ...details, phone: "1" } })
        );
        expect(plan).toMatchObject({ error: "Please enter a valid 10-digit phone number." });
    });

    it("rejects and clears a slot that is no longer bookable", () => {
        const afterCutoff = { ...NOW, timeInMinutes: 721 }; // 12:01, cutoff was 12:00
        expect(
            planCheckout(
                input({
                    requiresSlot: true,
                    selectedSlot: SLOT,
                    groupSlotDefs: [SLOT_DEFS],
                    now: afterCutoff,
                })
            )
        ).toEqual({
            kind: "invalid",
            error: "Your selected delivery slot is no longer available. Please pick another.",
            clearSlot: true,
        });
    });

    it("rejects and clears a slot the cart's restaurants don't all share", () => {
        const other = [{ start: "18:00", end: "19:00" }];
        expect(
            planCheckout(
                input({
                    requiresSlot: true,
                    selectedSlot: SLOT,
                    groupSlotDefs: [SLOT_DEFS, other],
                })
            )
        ).toMatchObject({ kind: "invalid", clearSlot: true });
    });

    it("accepts a slot right at its cutoff", () => {
        const atCutoff = { ...NOW, timeInMinutes: 720 };
        expect(
            planCheckout(
                input({
                    requiresSlot: true,
                    selectedSlot: SLOT,
                    groupSlotDefs: [SLOT_DEFS],
                    now: atCutoff,
                })
            ).kind
        ).toBe("place");
    });

    it("does not re-check a slot when none is required", () => {
        const afterCutoff = { ...NOW, timeInMinutes: 721 };
        expect(
            planCheckout(
                input({ selectedSlot: SLOT, groupSlotDefs: [SLOT_DEFS], now: afterCutoff })
            ).kind
        ).toBe("place");
    });
});

describe("planCheckout — sign-in guard", () => {
    it("sends a signed-out customer with an in-app cart to sign in", () => {
        expect(planCheckout(input({ isDirectFlow: true }))).toEqual({ kind: "sign-in" });
    });

    it("validates the form before asking to sign in", () => {
        expect(
            planCheckout(input({ isDirectFlow: true, userDetails: { ...details, name: "" } })).kind
        ).toBe("invalid");
    });

    it("lets a signed-out customer use WhatsApp checkout", () => {
        expect(planCheckout(input({ isDirectFlow: false })).kind).toBe("place");
    });

    it("lets a signed-in customer place an in-app order", () => {
        expect(planCheckout(input({ isDirectFlow: true, isSignedIn: true }))).toMatchObject({
            kind: "place",
            flow: "direct",
        });
    });
});

describe("planCheckout — duplicate order guard", () => {
    const recent = (over = {}) => ({
        phone: details.phone,
        number: "910000000000",
        timestamp: 1_000_000 - 30_000,
        ...over,
    });

    it("uses a one-minute window", () => {
        expect(DUPLICATE_ORDER_WINDOW_MS).toBe(60_000);
    });

    it("blocks a WhatsApp order from the same phone within a minute", () => {
        expect(planCheckout(input({ lastOrder: recent() }))).toEqual({ kind: "duplicate" });
    });

    it("blocks up to just under a minute", () => {
        expect(
            planCheckout(input({ lastOrder: recent({ timestamp: 1_000_000 - 59_999 }) })).kind
        ).toBe("duplicate");
    });

    it("allows the order once a full minute has passed", () => {
        expect(
            planCheckout(input({ lastOrder: recent({ timestamp: 1_000_000 - 60_000 }) })).kind
        ).toBe("place");
    });

    it("allows an order from a different phone", () => {
        expect(planCheckout(input({ lastOrder: recent({ phone: "9999999999" }) })).kind).toBe(
            "place"
        );
    });

    it("never blocks in-app orders", () => {
        expect(
            planCheckout(input({ isDirectFlow: true, isSignedIn: true, lastOrder: recent() })).kind
        ).toBe("place");
    });

    it("asks a signed-out in-app customer to sign in rather than flag a duplicate", () => {
        expect(planCheckout(input({ isDirectFlow: true, lastOrder: recent() })).kind).toBe(
            "sign-in"
        );
    });

    it("validates the form before flagging a duplicate", () => {
        expect(
            planCheckout(input({ lastOrder: recent(), userDetails: { ...details, campus: "" } }))
                .kind
        ).toBe("invalid");
    });

    it.each([
        ["nothing stored", null],
        ["a non-object", 42],
        ["no timestamp", { phone: details.phone }],
    ])("allows the order with %s", (_, lastOrder) => {
        expect(planCheckout(input({ lastOrder })).kind).toBe("place");
    });
});

describe("planCheckout — placing the order", () => {
    it("chooses the WhatsApp flow for a non-direct cart", () => {
        expect(planCheckout(input())).toMatchObject({ kind: "place", flow: "whatsapp" });
    });

    it("trims the customer's name and address", () => {
        expect(planCheckout(input())).toMatchObject({
            customer: { ...details, name: "Asha", address: "Hostel B" },
        });
    });

    it("has no delivery slot when none was picked", () => {
        expect(planCheckout(input())).toMatchObject({ deliverySlot: null });
    });

    it("records a restaurant slot without a campus", () => {
        const plan = planCheckout(
            input({ requiresSlot: true, selectedSlot: SLOT, groupSlotDefs: [SLOT_DEFS] })
        );
        expect(plan).toMatchObject({
            deliverySlot: {
                source: "restaurant",
                date: "2026-10-22",
                start: "13:00",
                end: "14:00",
                cutoffMinutes: 60,
                processingStart: "",
                processingEnd: "",
            },
        });
        expect(plan.kind === "place" && plan.deliverySlot).not.toHaveProperty("campusId");
    });

    it("records a campus slot against the campus pre-order config id", () => {
        const plan = planCheckout(
            input({
                requiresSlot: true,
                selectedSlot: SLOT,
                groupSlotDefs: [SLOT_DEFS],
                campusPreOrder: { enabled: true, id: "cfg-north" },
            })
        );
        expect(plan).toMatchObject({ deliverySlot: { source: "campus", campusId: "cfg-north" } });
    });

    it("falls back to the customer's campus when the config has no id", () => {
        const plan = planCheckout(
            input({
                requiresSlot: true,
                selectedSlot: SLOT,
                groupSlotDefs: [SLOT_DEFS],
                campusPreOrder: { enabled: true },
            })
        );
        expect(plan).toMatchObject({ deliverySlot: { source: "campus", campusId: "north" } });
    });

    it("validates a coupon up front only on the WhatsApp flow", () => {
        expect(planCheckout(input({ couponCode: "SAVE10" }))).toMatchObject({
            validateCoupon: true,
        });
        expect(
            planCheckout(input({ couponCode: "SAVE10", isDirectFlow: true, isSignedIn: true }))
        ).toMatchObject({ validateCoupon: false });
    });

    it("does not validate when there is no coupon", () => {
        expect(planCheckout(input({ couponCode: "" }))).toMatchObject({ validateCoupon: false });
        expect(planCheckout(input({ couponCode: null }))).toMatchObject({
            validateCoupon: false,
        });
    });
});

describe("classifyCheckoutError", () => {
    it("leaves in-app order errors to the order-flow message", () => {
        expect(classifyCheckoutError({ message: "Item unavailable" }, true)).toEqual({
            kind: "direct",
        });
        expect(classifyCheckoutError({ code: "functions/resource-exhausted" }, true)).toEqual({
            kind: "direct",
        });
    });

    it("treats an in-app error mentioning a coupon as a coupon problem", () => {
        expect(
            classifyCheckoutError(
                { code: "functions/not-found", message: "Coupon not found" },
                true
            )
        ).toEqual({
            kind: "message",
            message: "Invalid coupon. Please remove it to proceed.",
            removeCoupon: true,
        });
        expect(classifyCheckoutError({ message: "COUPON expired" }, true)).toEqual({
            kind: "message",
            message: "Something went wrong. Please try again.",
            removeCoupon: false,
        });
    });

    const limit = {
        kind: "message",
        message: "Coupon usage limit reached. Please remove it to proceed.",
        removeCoupon: true,
    };
    const invalid = {
        kind: "message",
        message: "Invalid coupon. Please remove it to proceed.",
        removeCoupon: true,
    };
    const generic = {
        kind: "message",
        message: "Something went wrong. Please try again.",
        removeCoupon: false,
    };

    it.each([
        [{ code: "functions/resource-exhausted" }, limit],
        [{ code: "resource-exhausted" }, limit],
        [{ message: "Usage limit reached" }, limit],
        [{ code: "functions/not-found" }, invalid],
        [{ code: "not-found" }, invalid],
        [{ message: "Invalid coupon code" }, invalid],
        [{ code: "functions/internal", message: "boom" }, generic],
        [{ message: "invalid input" }, generic], // case-sensitive "Invalid"
        [{ message: "Limit Reached" }, generic], // case-sensitive "limit reached"
        [{}, generic],
    ])("maps WhatsApp error %j", (error, expected) => {
        expect(classifyCheckoutError(error, false)).toEqual(expected);
    });

    it("checks the usage limit before an invalid coupon", () => {
        expect(
            classifyCheckoutError({ code: "functions/not-found", message: "limit reached" }, false)
        ).toEqual(limit);
    });
});
