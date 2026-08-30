"use strict";

import { describe, it, expect } from "vitest";
import { cartReducer, initialState } from "@/app/context/cartReducer";

/** Bare cart line. `cartKey` is what distinguishes variants of the same item. */
const item = (overrides = {}) => ({
    id: "biryani",
    name: "Chicken Biryani",
    price: 180,
    unitPrice: 180,
    restaurantId: "res-1",
    restaurantName: "Hotel Ashiana",
    ...overrides,
});

/** State with the given lines already in the cart. */
const withItems = (...cartItems) => ({ ...initialState, cartItems });

const add = (payload) => ({ type: "ADD_ITEM", payload });

describe("cartReducer — ADD_ITEM", () => {
    it("adds a new line with quantity 1 by default", () => {
        const next = cartReducer(initialState, add({ item: item() }));

        expect(next.cartItems).toHaveLength(1);
        expect(next.cartItems[0]).toMatchObject({ id: "biryani", quantity: 1, cartKey: "biryani" });
    });

    it("honours an explicit quantityDelta on a new line", () => {
        const next = cartReducer(initialState, add({ item: item(), quantityDelta: 3 }));

        expect(next.cartItems[0].quantity).toBe(3);
    });

    it("increments an existing line instead of duplicating it", () => {
        const state = withItems({ ...item(), cartKey: "biryani", quantity: 2 });
        const next = cartReducer(state, add({ item: item(), quantityDelta: 2 }));

        expect(next.cartItems).toHaveLength(1);
        expect(next.cartItems[0].quantity).toBe(4);
    });

    it("keeps variants of the same item as separate lines", () => {
        // Variants and addons produce distinct cartKeys off one menu-item id;
        // collapsing them would silently merge a half plate into a full plate.
        const half = { ...item({ cartKey: "biryani::half" }), quantity: 1 };
        const next = cartReducer(
            withItems(half),
            add({ item: item({ cartKey: "biryani::full" }) })
        );

        expect(next.cartItems).toHaveLength(2);
        expect(next.cartItems.map((i) => i.cartKey)).toEqual(["biryani::half", "biryani::full"]);
    });

    it("decrements an existing line with a negative delta", () => {
        const state = withItems({ ...item(), cartKey: "biryani", quantity: 3 });
        const next = cartReducer(state, add({ item: item(), quantityDelta: -1 }));

        expect(next.cartItems[0].quantity).toBe(2);
    });

    it("drops the line when a negative delta takes it to zero", () => {
        const state = withItems({ ...item(), cartKey: "biryani", quantity: 1 });
        const next = cartReducer(state, add({ item: item(), quantityDelta: -1 }));

        expect(next.cartItems).toEqual([]);
    });

    it("never goes negative when the delta overshoots", () => {
        const state = withItems({ ...item(), cartKey: "biryani", quantity: 1 });
        const next = cartReducer(state, add({ item: item(), quantityDelta: -5 }));

        expect(next.cartItems).toEqual([]);
    });

    it("ignores a negative delta for an item not in the cart", () => {
        const next = cartReducer(initialState, add({ item: item(), quantityDelta: -1 }));

        expect(next.cartItems).toEqual([]);
    });

    it("leaves other lines untouched", () => {
        const other = { ...item({ id: "naan", cartKey: "naan" }), quantity: 2 };
        const next = cartReducer(withItems(other), add({ item: item() }));

        expect(next.cartItems).toHaveLength(2);
        expect(next.cartItems[0]).toEqual(other);
    });
});

describe("cartReducer — REMOVE_ITEM", () => {
    it("removes the matching line", () => {
        const state = withItems(
            { ...item(), cartKey: "biryani", quantity: 1 },
            { ...item({ id: "naan" }), cartKey: "naan", quantity: 2 }
        );
        const next = cartReducer(state, { type: "REMOVE_ITEM", payload: "biryani" });

        expect(next.cartItems.map((i) => i.cartKey)).toEqual(["naan"]);
    });

    it("falls back to id when the line has no cartKey", () => {
        const state = withItems({ ...item(), quantity: 1 });
        const next = cartReducer(state, { type: "REMOVE_ITEM", payload: "biryani" });

        expect(next.cartItems).toEqual([]);
    });

    it("is a no-op for a key that isn't in the cart", () => {
        const state = withItems({ ...item(), cartKey: "biryani", quantity: 1 });
        const next = cartReducer(state, { type: "REMOVE_ITEM", payload: "nope" });

        expect(next.cartItems).toHaveLength(1);
    });
});

describe("cartReducer — UPDATE_QUANTITY", () => {
    const bump = (id, delta) => ({ type: "UPDATE_QUANTITY", payload: { id, delta } });

    it("applies the delta to the matching line", () => {
        const state = withItems({ ...item(), cartKey: "biryani", quantity: 2 });

        expect(cartReducer(state, bump("biryani", 3)).cartItems[0].quantity).toBe(5);
        expect(cartReducer(state, bump("biryani", -1)).cartItems[0].quantity).toBe(1);
    });

    it("removes the line when the quantity reaches zero", () => {
        const state = withItems({ ...item(), cartKey: "biryani", quantity: 2 });

        expect(cartReducer(state, bump("biryani", -2)).cartItems).toEqual([]);
    });

    it("clamps at zero rather than going negative", () => {
        const state = withItems({ ...item(), cartKey: "biryani", quantity: 1 });

        expect(cartReducer(state, bump("biryani", -99)).cartItems).toEqual([]);
    });

    it("touches only the targeted line", () => {
        const state = withItems(
            { ...item(), cartKey: "biryani", quantity: 2 },
            { ...item({ id: "naan" }), cartKey: "naan", quantity: 2 }
        );
        const next = cartReducer(state, bump("biryani", 1));

        expect(next.cartItems.find((i) => i.cartKey === "naan").quantity).toBe(2);
    });
});

describe("cartReducer — coupons", () => {
    const applied = {
        ...initialState,
        couponCode: "SAVE50",
        activeCoupon: { code: "SAVE50", value: 50 },
    };

    it("stores the code and the resolved coupon", () => {
        const next = cartReducer(initialState, {
            type: "APPLY_COUPON",
            payload: { code: "SAVE50", coupon: { code: "SAVE50", value: 50 } },
        });

        expect(next.couponCode).toBe("SAVE50");
        expect(next.activeCoupon).toEqual({ code: "SAVE50", value: 50 });
    });

    it("clears both on removal", () => {
        const next = cartReducer(applied, { type: "REMOVE_COUPON" });

        expect(next.couponCode).toBeNull();
        expect(next.activeCoupon).toBeNull();
    });

    it("clears the coupon along with the cart", () => {
        // A coupon surviving CLEAR_CART would apply to an unrelated next order.
        const state = { ...applied, cartItems: [{ ...item(), quantity: 1 }] };
        const next = cartReducer(state, { type: "CLEAR_CART" });

        expect(next.cartItems).toEqual([]);
        expect(next.couponCode).toBeNull();
        expect(next.activeCoupon).toBeNull();
    });

    it("keeps the customer's details through CLEAR_CART", () => {
        const state = {
            ...initialState,
            userDetails: { ...initialState.userDetails, name: "Sonu", phone: "9876543210" },
            cartItems: [{ ...item(), quantity: 1 }],
        };
        const next = cartReducer(state, { type: "CLEAR_CART" });

        expect(next.userDetails).toEqual(state.userDetails);
    });
});

describe("cartReducer — user details", () => {
    it("LOAD_USER_DETAILS merges into what's already there", () => {
        const state = {
            ...initialState,
            userDetails: { ...initialState.userDetails, name: "Sonu", phone: "9876543210" },
        };
        const next = cartReducer(state, { type: "LOAD_USER_DETAILS", payload: { campus: "PU" } });

        expect(next.userDetails).toMatchObject({ name: "Sonu", phone: "9876543210", campus: "PU" });
    });

    it("UPDATE_USER_DETAILS replaces wholesale", () => {
        // Asymmetric with LOAD on purpose — the form owns the whole object.
        const state = {
            ...initialState,
            userDetails: { ...initialState.userDetails, name: "Sonu", phone: "9876543210" },
        };
        const next = cartReducer(state, {
            type: "UPDATE_USER_DETAILS",
            payload: { name: "Sonu", phone: "", campus: "", address: "", instructions: "" },
        });

        expect(next.userDetails.phone).toBe("");
    });
});

describe("cartReducer — misc", () => {
    it("SET_CART_OPEN toggles the drawer without touching the cart", () => {
        const state = withItems({ ...item(), quantity: 1 });
        const next = cartReducer(state, { type: "SET_CART_OPEN", payload: true });

        expect(next.isCartOpen).toBe(true);
        expect(next.cartItems).toEqual(state.cartItems);
    });

    it("RESTORE_CART swaps in the persisted lines", () => {
        const restored = [{ ...item(), cartKey: "biryani", quantity: 2 }];
        const next = cartReducer(initialState, { type: "RESTORE_CART", payload: restored });

        expect(next.cartItems).toEqual(restored);
    });

    it("returns the same state object for an unknown action", () => {
        const state = withItems({ ...item(), quantity: 1 });

        expect(cartReducer(state, { type: "NOPE" })).toBe(state);
    });

    it("does not mutate the state it is given", () => {
        const line = { ...item(), cartKey: "biryani", quantity: 1 };
        const state = withItems(line);
        const snapshot = structuredClone(state);

        cartReducer(state, add({ item: item(), quantityDelta: 5 }));
        cartReducer(state, { type: "UPDATE_QUANTITY", payload: { id: "biryani", delta: -1 } });
        cartReducer(state, { type: "REMOVE_ITEM", payload: "biryani" });
        cartReducer(state, { type: "CLEAR_CART" });

        expect(state).toEqual(snapshot);
    });
});
