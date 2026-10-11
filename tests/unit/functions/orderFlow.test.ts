import { describe, it, expect } from "vitest";
import { applyEvent, chooseOrderFlow, placeOrder } from "../../../functions/src/order-flow";
import type {
    Actor,
    DirectOrder,
    FlowEvent,
    FlowMenuItem,
    FlowRestaurant,
} from "../../../functions/src/order-flow";

const partner = (id: string) => ({ id, isPaymentPartner: true });
const regular = (id: string) => ({ id, isPaymentPartner: false });

describe("chooseOrderFlow", () => {
    it("sends a cart from one Payment Partner through the in-app flow", () => {
        expect(chooseOrderFlow(["r1"], [partner("r1")])).toBe("direct");
    });

    it("keeps a cart on WhatsApp when any restaurant is not a Payment Partner", () => {
        expect(chooseOrderFlow(["r1", "r2"], [partner("r1"), regular("r2")])).toBe("whatsapp");
    });
});

// Base 30 / threshold 3 / extra 10: up to 3 units ship for ₹30, ₹10 per unit beyond.
const SETTINGS = {
    baseDeliveryCharge: "30",
    extraItemThreshold: "3",
    extraItemCharge: "10",
    deliveryCampusConfig: [{ id: "PU", name: "PU", deliveryCharge: 0 }],
};

type MenuEntry = Pick<FlowMenuItem, "id" | "name" | "price"> & Partial<FlowMenuItem>;

const restaurant = (
    id: string,
    menu: MenuEntry[],
    extra: Partial<FlowRestaurant> = {}
): FlowRestaurant => ({
    id,
    name: `Restaurant ${id}`,
    isPaymentPartner: true,
    baseDeliveryCharge: "",
    extraItemThreshold: "",
    extraItemCharge: "",
    minOrderAmount: "",
    menu: menu.map((m) => ({ category: "Mains", isVisible: true, isVeg: true, ...m })),
    ...extra,
});

const R1 = restaurant("r1", [
    { id: "biryani", name: "Biryani", price: "120" },
    { id: "lime", name: "Lime Soda", price: "40" },
    { id: "raita", name: "Raita", price: "30" },
]);
const R2 = restaurant("r2", [
    {
        id: "shawarma",
        name: "Shawarma",
        price: "90",
        variants: [{ id: "large", name: "Large", price: "130" }],
        addons: [
            { id: "mayo", name: "Extra Mayo", price: "15" },
            { id: "cheese", name: "Cheese", price: "25" },
        ],
    },
]);

const CUSTOMER = {
    userId: "u1",
    name: "Asha",
    phone: "9000000000",
    campus: "PU",
    address: "Hostel 4",
};

const place = (lines: Record<string, unknown>[], ctx = {}) =>
    placeOrder(
        { lines: lines as never, customer: CUSTOMER },
        { restaurants: [R1, R2], settings: SETTINGS, coupon: null, ...ctx }
    );

/** The OrderFlowError code a call fails with, or null when it succeeds. */
const errorCode = (fn: () => unknown): string | null => {
    try {
        fn();
        return null;
    } catch (e) {
        return (e as { code?: string }).code ?? String(e);
    }
};

const SAVE20 = { code: "SAVE20", type: "FLAT", value: "20", min_order: "200" };

describe("placeOrder", () => {
    it("prices a single-restaurant order from the menu and waits on the restaurant", () => {
        const { order } = place([{ itemId: "biryani", restaurantId: "r1", quantity: 2 }]);

        expect(order).toMatchObject({
            flow: "direct",
            status: "awaiting_restaurants",
            restaurantIds: ["r1"],
            legs: { r1: { status: "pending" } },
            total: 240,
            deliveryCharge: 30,
            discount: 0,
            finalTotal: 270,
        });
    });

    it("gives every restaurant its own leg and adds the multi-restaurant surcharge", () => {
        const { order } = place([
            { itemId: "biryani", restaurantId: "r1", quantity: 1 },
            { itemId: "shawarma", restaurantId: "r2", quantity: 1 },
        ]);

        expect(order).toMatchObject({
            restaurantIds: ["r1", "r2"],
            legs: { r1: { status: "pending" }, r2: { status: "pending" } },
            total: 210,
            deliveryCharge: 40,
            finalTotal: 250,
        });
    });

    it("prices the chosen variant and add-ons from the menu", () => {
        const { order } = place([
            {
                itemId: "shawarma",
                restaurantId: "r2",
                quantity: 2,
                variantId: "large",
                addonIds: ["cheese"],
            },
        ]);

        expect(order.items[0]).toMatchObject({
            unitPrice: 155,
            variant: { id: "large", name: "Large", price: 130 },
            addons: [{ id: "cheese", name: "Cheese", price: 25 }],
        });
        expect(order.total).toBe(310);
    });

    it("refuses a restaurant that is not a Payment Partner", () => {
        const r3 = restaurant("r3", [{ id: "dosa", name: "Dosa", price: "60" }], {
            isPaymentPartner: false,
        });
        const call = () =>
            place([{ itemId: "dosa", restaurantId: "r3", quantity: 1 }], {
                restaurants: [R1, R2, r3],
            });

        expect(errorCode(call)).toBe("not_payment_partner");
    });

    it("refuses an item that is hidden from the menu", () => {
        const r1 = restaurant("r1", [
            { id: "biryani", name: "Biryani", price: "120", isVisible: false },
        ]);
        const call = () =>
            place([{ itemId: "biryani", restaurantId: "r1", quantity: 1 }], { restaurants: [r1] });

        expect(errorCode(call)).toBe("item_unavailable");
    });

    it("refuses a restaurant's share that is below its minimum order", () => {
        const r1 = { ...R1, minOrderAmount: "150" };
        const call = () =>
            place([{ itemId: "biryani", restaurantId: "r1", quantity: 1 }], { restaurants: [r1] });

        expect(errorCode(call)).toBe("below_minimum");
    });

    it("applies the coupon and records its code", () => {
        const { order } = place([{ itemId: "biryani", restaurantId: "r1", quantity: 2 }], {
            coupon: SAVE20,
        });

        expect(order).toMatchObject({ couponCode: "SAVE20", discount: 20, finalTotal: 250 });
    });

    it("pushes the new order to every restaurant in it", () => {
        const { notifications } = place([
            { itemId: "biryani", restaurantId: "r1", quantity: 1 },
            { itemId: "shawarma", restaurantId: "r2", quantity: 1 },
        ]);

        expect(notifications).toEqual([{ kind: "new_order", to: { restaurantIds: ["r1", "r2"] } }]);
    });
});

const CTX = { restaurants: [R1, R2], settings: SETTINGS, coupon: null };

const BIRYANI = { itemId: "biryani", restaurantId: "r1", quantity: 2 };
const SHAWARMA = { itemId: "shawarma", restaurantId: "r2", quantity: 1 };

const placed = (...lines: Record<string, unknown>[]) => place(lines).order;

const apply = (order: DirectOrder, event: FlowEvent, actor: Actor, ctx = {}) =>
    applyEvent(order, event, actor, { ...CTX, ...ctx });

const restaurantOf = (restaurantId: string): Actor => ({ role: "partner", restaurantId });
const customer: Actor = { role: "customer", uid: "u1" };
const admin: Actor = { role: "admin" };

describe("restaurants responding", () => {
    it("moves a single-restaurant order to payment once the restaurant confirms", () => {
        const { order } = apply(placed(BIRYANI), { type: "confirm" }, restaurantOf("r1"));

        expect(order.status).toBe("awaiting_payment");
        expect(order.legs.r1.status).toBe("confirmed");
    });

    it("keeps waiting while another restaurant has not answered", () => {
        const { order } = apply(placed(BIRYANI, SHAWARMA), { type: "confirm" }, restaurantOf("r1"));

        expect(order.status).toBe("awaiting_restaurants");
    });

    it("has the restaurant collect payment when it is the only one", () => {
        const { order } = apply(placed(BIRYANI), { type: "confirm" }, restaurantOf("r1"));

        expect(order.paymentCollector).toEqual({ type: "restaurant", restaurantId: "r1" });
    });

    it("has Pumato collect payment once several restaurants have confirmed", () => {
        const first = apply(placed(BIRYANI, SHAWARMA), { type: "confirm" }, restaurantOf("r1"));
        const { order } = apply(first.order, { type: "confirm" }, restaurantOf("r2"));

        expect(order.status).toBe("awaiting_payment");
        expect(order.paymentCollector).toEqual({ type: "pumato" });
    });

    it("pushes 'ready to pay' to the customer when the last restaurant confirms", () => {
        const { notifications } = apply(placed(BIRYANI), { type: "confirm" }, restaurantOf("r1"));

        expect(notifications).toEqual([{ kind: "ready_to_pay", to: { userId: "u1" } }]);
    });

    it("pushes nothing while other restaurants are still deciding", () => {
        const { notifications } = apply(
            placed(BIRYANI, SHAWARMA),
            { type: "confirm" },
            restaurantOf("r1")
        );

        expect(notifications).toEqual([]);
    });

    it("refuses a confirmation from a restaurant that is not in the order", () => {
        const call = () => apply(placed(BIRYANI), { type: "confirm" }, restaurantOf("r2"));

        expect(errorCode(call)).toBe("not_allowed");
    });

    it("refuses a confirmation from anyone but a restaurant", () => {
        const call = () => apply(placed(BIRYANI), { type: "confirm" }, customer);

        expect(errorCode(call)).toBe("not_allowed");
    });

    it("refuses to confirm a leg that was already answered", () => {
        const { order } = apply(placed(BIRYANI), { type: "confirm" }, restaurantOf("r1"));
        const call = () => apply(order, { type: "confirm" }, restaurantOf("r1"));

        expect(errorCode(call)).toBe("invalid_transition");
    });

    it("asks the customer to decide when a restaurant is missing items", () => {
        const { order } = apply(
            placed(BIRYANI, SHAWARMA),
            { type: "mark_unavailable", itemIds: ["shawarma"] },
            restaurantOf("r2")
        );

        expect(order.status).toBe("awaiting_customer");
        expect(order.legs.r2).toEqual({ status: "unavailable", outOfStockItems: ["shawarma"] });
    });

    it("pushes the out-of-stock news to the customer", () => {
        const { notifications } = apply(
            placed(BIRYANI),
            { type: "mark_unavailable", itemIds: ["biryani"] },
            restaurantOf("r1")
        );

        expect(notifications).toEqual([{ kind: "out_of_stock", to: { userId: "u1" } }]);
    });
});

const LIME = { itemId: "lime", restaurantId: "r1", quantity: 1 };

/** Runs the events in order, each by its actor, from a freshly placed order. */
const run = (order: DirectOrder, ...steps: [FlowEvent, Actor][]) =>
    steps.reduce((o, [event, actor]) => apply(o, event, actor).order, order);

/** Biryani ×2 + lime from r1 and a shawarma from r2; r1 is out of lime, r2 confirmed. */
const limeOutOfStock = () =>
    run(
        placed(BIRYANI, LIME, SHAWARMA),
        [{ type: "mark_unavailable", itemIds: ["lime"] }, restaurantOf("r1")],
        [{ type: "confirm" }, restaurantOf("r2")]
    );

describe("customer resolving unavailable items", () => {
    it("drops just the missing items and reprices what is left", () => {
        const { order } = apply(
            limeOutOfStock(),
            { type: "resolve", restaurantId: "r1", choice: "remove" },
            customer
        );

        expect(order.items.map((i) => i.id)).toEqual(["biryani", "shawarma"]);
        expect(order.legs.r1.status).toBe("confirmed");
        expect(order).toMatchObject({
            status: "awaiting_payment",
            total: 330,
            deliveryCharge: 40,
            finalTotal: 370,
        });
    });

    it("drops a restaurant left with nothing, so it is priced and paid as a single-restaurant order", () => {
        const shawarmaOut = run(
            placed(BIRYANI, LIME, SHAWARMA),
            [{ type: "confirm" }, restaurantOf("r1")],
            [{ type: "mark_unavailable", itemIds: ["shawarma"] }, restaurantOf("r2")]
        );
        const { order } = apply(
            shawarmaOut,
            { type: "resolve", restaurantId: "r2", choice: "remove" },
            customer
        );

        expect(order.legs.r2.status).toBe("dropped");
        expect(order.paymentCollector).toEqual({ type: "restaurant", restaurantId: "r1" });
        expect(order).toMatchObject({ total: 280, deliveryCharge: 30, finalTotal: 310 });
    });

    it("cancels a restaurant with everything ordered from it", () => {
        const { order } = apply(
            limeOutOfStock(),
            { type: "resolve", restaurantId: "r1", choice: "cancel_restaurant" },
            customer
        );

        expect(order.items.map((i) => i.id)).toEqual(["shawarma"]);
        expect(order.legs.r1.status).toBe("dropped");
        expect(order.paymentCollector).toEqual({ type: "restaurant", restaurantId: "r2" });
        expect(order).toMatchObject({ total: 90, deliveryCharge: 30, finalTotal: 120 });
    });

    it("sends the restaurant a replacement from its own menu to confirm", () => {
        const { order } = apply(
            limeOutOfStock(),
            {
                type: "resolve",
                restaurantId: "r1",
                choice: "replace",
                replacements: [{ itemId: "raita", restaurantId: "r1", quantity: 1 }],
            },
            customer
        );

        expect(order.items.map((i) => i.id)).toEqual(["biryani", "shawarma", "raita"]);
        expect(order.legs.r1.status).toBe("pending");
        expect(order.status).toBe("awaiting_restaurants");
    });

    it("sends a restaurant that had already confirmed back to confirm the added items", () => {
        const { order } = apply(
            limeOutOfStock(),
            {
                type: "resolve",
                restaurantId: "r1",
                choice: "replace",
                replacements: [{ itemId: "shawarma", restaurantId: "r2", quantity: 1 }],
            },
            customer
        );

        expect(order.legs).toEqual({ r1: { status: "confirmed" }, r2: { status: "pending" } });
    });

    it("brings a new restaurant into the order and pushes it the order", () => {
        const biryaniOut = run(placed(BIRYANI), [
            { type: "mark_unavailable", itemIds: ["biryani"] },
            restaurantOf("r1"),
        ]);
        const { order, notifications } = apply(
            biryaniOut,
            {
                type: "resolve",
                restaurantId: "r1",
                choice: "replace",
                replacements: [{ itemId: "shawarma", restaurantId: "r2", quantity: 2 }],
            },
            customer
        );

        expect(order.restaurantIds).toEqual(["r1", "r2"]);
        expect(order.legs).toEqual({ r1: { status: "dropped" }, r2: { status: "pending" } });
        expect(notifications).toEqual([{ kind: "new_order", to: { restaurantIds: ["r2"] } }]);
    });

    it("refuses a replacement from a restaurant that is not a Payment Partner", () => {
        const r3 = restaurant("r3", [{ id: "dosa", name: "Dosa", price: "60" }], {
            isPaymentPartner: false,
        });
        const call = () =>
            apply(
                limeOutOfStock(),
                {
                    type: "resolve",
                    restaurantId: "r1",
                    choice: "replace",
                    replacements: [{ itemId: "dosa", restaurantId: "r3", quantity: 1 }],
                },
                customer,
                { restaurants: [R1, R2, r3] }
            );

        expect(errorCode(call)).toBe("not_payment_partner");
    });

    it("refuses a change that leaves a restaurant below its minimum order", () => {
        const r1 = { ...R1, minOrderAmount: "250" };
        const limeOut = run(placed(BIRYANI, LIME), [
            { type: "mark_unavailable", itemIds: ["lime"] },
            restaurantOf("r1"),
        ]);
        const call = () =>
            apply(limeOut, { type: "resolve", restaurantId: "r1", choice: "remove" }, customer, {
                restaurants: [r1, R2],
            });

        expect(errorCode(call)).toBe("below_minimum");
    });

    it("cancels the order when the customer drops its last restaurant", () => {
        const biryaniOut = run(placed(BIRYANI), [
            { type: "mark_unavailable", itemIds: ["biryani"] },
            restaurantOf("r1"),
        ]);
        const { order, notifications } = apply(
            biryaniOut,
            { type: "resolve", restaurantId: "r1", choice: "cancel_restaurant" },
            customer
        );

        expect(order.status).toBe("cancelled");
        expect(notifications).toEqual([]);
    });

    it("refuses a resolution from anyone but the order's customer", () => {
        const resolve: FlowEvent = { type: "resolve", restaurantId: "r1", choice: "remove" };

        expect(
            errorCode(() => apply(limeOutOfStock(), resolve, { role: "customer", uid: "u2" }))
        ).toBe("not_allowed");
        expect(errorCode(() => apply(limeOutOfStock(), resolve, restaurantOf("r1")))).toBe(
            "not_allowed"
        );
    });

    it("refuses to resolve a restaurant that has nothing unavailable", () => {
        const call = () =>
            apply(
                limeOutOfStock(),
                { type: "resolve", restaurantId: "r2", choice: "cancel_restaurant" },
                customer
            );

        expect(errorCode(call)).toBe("invalid_transition");
    });
});

const PAYMENT: FlowEvent = {
    type: "submit_payment",
    transactionId: "412345678901",
    screenshotPath: "payment-proofs/o1/shot.jpg",
};

/** A single-restaurant order its restaurant has confirmed. */
const readyToPay = () => run(placed(BIRYANI), [{ type: "confirm" }, restaurantOf("r1")]);

/** A two-restaurant order both restaurants have confirmed: Pumato collects. */
const readyToPayPumato = () =>
    run(
        placed(BIRYANI, SHAWARMA),
        [{ type: "confirm" }, restaurantOf("r1")],
        [{ type: "confirm" }, restaurantOf("r2")]
    );

describe("paying", () => {
    it("holds the customer's payment proof for verification", () => {
        const { order } = apply(readyToPay(), PAYMENT, customer);

        expect(order.status).toBe("payment_submitted");
        expect(order.payment).toEqual({
            status: "pending_verification",
            transactionId: "412345678901",
            screenshotPath: "payment-proofs/o1/shot.jpg",
        });
    });

    it("refuses payment before every restaurant has confirmed", () => {
        expect(errorCode(() => apply(placed(BIRYANI), PAYMENT, customer))).toBe(
            "invalid_transition"
        );
    });

    it("refuses a second submission while one is awaiting verification", () => {
        const { order } = apply(readyToPay(), PAYMENT, customer);

        expect(errorCode(() => apply(order, PAYMENT, customer))).toBe("invalid_transition");
    });

    it("refuses payment from anyone but the order's customer", () => {
        expect(errorCode(() => apply(readyToPay(), PAYMENT, { role: "customer", uid: "u2" }))).toBe(
            "not_allowed"
        );
    });

    it("pushes the collecting restaurant a payment to verify", () => {
        const { notifications } = apply(readyToPay(), PAYMENT, customer);

        expect(notifications).toEqual([
            { kind: "payment_to_verify", to: { restaurantIds: ["r1"] } },
        ]);
    });
});

const submitted = () => apply(readyToPay(), PAYMENT, customer).order;
const submittedPumato = () => apply(readyToPayPumato(), PAYMENT, customer).order;

describe("verifying payment", () => {
    it("lets the collecting restaurant verify, which tells it to start preparing", () => {
        const { order } = apply(submitted(), { type: "verify_payment" }, restaurantOf("r1"));

        expect(order.status).toBe("paid");
        expect(order.payment?.status).toBe("verified");
        expect(order.legs.r1.status).toBe("paid");
    });

    it("leaves a payment Pumato collected for an admin to verify", () => {
        const verify: FlowEvent = { type: "verify_payment" };

        expect(errorCode(() => apply(submittedPumato(), verify, restaurantOf("r1")))).toBe(
            "not_allowed"
        );
        const { order } = apply(submittedPumato(), verify, admin);
        expect(order.legs).toEqual({ r1: { status: "paid" }, r2: { status: "paid" } });
    });

    it("refuses verification from a restaurant that did not collect the payment", () => {
        expect(
            errorCode(() => apply(submitted(), { type: "verify_payment" }, restaurantOf("r2")))
        ).toBe("not_allowed");
    });

    it("sends a rejected payment back to the customer to pay again", () => {
        const { order, notifications } = apply(
            submitted(),
            { type: "reject_payment" },
            restaurantOf("r1")
        );

        expect(order.status).toBe("awaiting_payment");
        expect(order.payment?.status).toBe("rejected");
        expect(notifications).toEqual([{ kind: "ready_to_pay", to: { userId: "u1" } }]);
    });

    it("accepts a fresh submission after a rejection", () => {
        const rejected = apply(submitted(), { type: "reject_payment" }, restaurantOf("r1")).order;
        const { order } = apply(
            rejected,
            { ...PAYMENT, transactionId: "998877665544" } as FlowEvent,
            customer
        );

        expect(order.status).toBe("payment_submitted");
        expect(order.payment).toMatchObject({
            status: "pending_verification",
            transactionId: "998877665544",
        });
    });
});

describe("preparing", () => {
    const paidPumato = () => apply(submittedPumato(), { type: "verify_payment" }, admin).order;

    it("hands the order to delivery once every restaurant is ready, without a push", () => {
        const first = apply(paidPumato(), { type: "mark_ready" }, restaurantOf("r1"));
        expect(first.order.status).toBe("paid");

        const { order, notifications } = apply(
            first.order,
            { type: "mark_ready" },
            restaurantOf("r2")
        );
        expect(order.status).toBe("ready_for_delivery");
        expect(order.legs).toEqual({ r1: { status: "ready" }, r2: { status: "ready" } });
        expect(notifications).toEqual([]);
    });

    it("refuses 'ready' before the payment is verified", () => {
        expect(
            errorCode(() => apply(submitted(), { type: "mark_ready" }, restaurantOf("r1")))
        ).toBe("invalid_transition");
    });
});

describe("admin handling stuck orders", () => {
    it("lets an admin cancel an order at any point before pickup", () => {
        const { order } = apply(submitted(), { type: "cancel" }, admin);

        expect(order.status).toBe("cancelled");
    });

    it("refuses cancellation from anyone else", () => {
        expect(errorCode(() => apply(submitted(), { type: "cancel" }, customer))).toBe(
            "not_allowed"
        );
        expect(errorCode(() => apply(submitted(), { type: "cancel" }, restaurantOf("r1")))).toBe(
            "not_allowed"
        );
    });
});
