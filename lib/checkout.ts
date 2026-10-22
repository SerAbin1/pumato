import { chooseOrderFlow } from "@/functions/src/order-flow";
import { isPreOrderSlotSelectionValid, buildDeliverySlotFromOccurrence } from "@/lib/preOrderSlots";
import type { SlotDef, SlotNow, SlotOccurrence } from "@/lib/preOrderSlots";
import type { CartItem, DeliverySlot, UserDetails } from "@/lib/types";

/**
 * The decisions behind the cart's checkout button: what's wrong with the
 * form, whether the customer has to sign in or is repeating an order, and
 * which flow the order goes through. Pure — the caller reads the clock,
 * storage and auth and does the I/O.
 */

/** A repeat WhatsApp order from the same phone within this window is held back. */
export const DUPLICATE_ORDER_WINDOW_MS = 60 * 1000;

/**
 * Carts made up entirely of Payment Partner restaurants are confirmed and paid
 * in the app; anything else keeps the WhatsApp flow.
 */
export const isDirectCart = (
    cartItems: Pick<CartItem, "restaurantId">[],
    restaurants: { id: string; isPaymentPartner?: boolean }[]
): boolean => {
    const ids = [
        ...new Set(cartItems.map((item) => item.restaurantId).filter((id): id is string => !!id)),
    ];
    return ids.length > 0 && chooseOrderFlow(ids, restaurants) === "direct";
};

export interface CheckoutInput {
    cartItemCount: number;
    userDetails: UserDetails;
    requiresSlot: boolean;
    selectedSlot: SlotOccurrence | null;
    /** Each slot group's raw definitions, to re-check the chosen slot against `now`. */
    groupSlotDefs: (SlotDef[] | null | undefined)[];
    now: SlotNow;
    campusPreOrder: { enabled: boolean; id?: string };
    isDirectFlow: boolean;
    isSignedIn: boolean;
    couponCode: string | null | undefined;
    /** The parsed `pumato_last_order` record, if any. */
    lastOrder: unknown;
    nowMs: number;
}

export type CheckoutPlan =
    | { kind: "invalid"; error: string; clearSlot: boolean }
    /** In-app orders need an account. */
    | { kind: "sign-in" }
    | { kind: "duplicate" }
    | {
          kind: "place";
          flow: "direct" | "whatsapp";
          /** The customer with name and address trimmed. */
          customer: UserDetails;
          deliverySlot: DeliverySlot | null;
          /** Check the coupon before placing. In-app orders count it server-side instead. */
          validateCoupon: boolean;
      };

const invalid = (error: string, clearSlot = false): CheckoutPlan => ({
    kind: "invalid",
    error,
    clearSlot,
});

const isRecentOrderFrom = (lastOrder: unknown, phone: string, nowMs: number): boolean => {
    const last = lastOrder as { phone?: string; timestamp?: number } | null;
    if (!last || last.phone !== phone) return false;
    return nowMs - (last.timestamp as number) < DUPLICATE_ORDER_WINDOW_MS;
};

export function planCheckout(input: CheckoutInput): CheckoutPlan {
    const { userDetails, requiresSlot, selectedSlot, campusPreOrder, isDirectFlow } = input;

    if (input.cartItemCount === 0) {
        return invalid("Your cart is empty. Please add items before checking out.");
    }
    const name = userDetails.name.trim();
    const address = userDetails.address.trim();
    if (!name || !userDetails.phone || !userDetails.campus || !address) {
        return invalid("Please fill in all details including Campus and Hostel.");
    }
    if (userDetails.phone.length !== 10) {
        return invalid("Please enter a valid 10-digit phone number.");
    }
    if (requiresSlot && !selectedSlot) {
        return invalid("Please select a delivery time slot.");
    }
    if (
        requiresSlot &&
        !isPreOrderSlotSelectionValid(selectedSlot, input.groupSlotDefs, input.now)
    ) {
        return invalid(
            "Your selected delivery slot is no longer available. Please pick another.",
            true
        );
    }

    if (isDirectFlow && !input.isSignedIn) return { kind: "sign-in" };

    if (!isDirectFlow && isRecentOrderFrom(input.lastOrder, userDetails.phone, input.nowMs)) {
        return { kind: "duplicate" };
    }

    return {
        kind: "place",
        flow: isDirectFlow ? "direct" : "whatsapp",
        customer: { ...userDetails, name, address },
        deliverySlot: !selectedSlot
            ? null
            : buildDeliverySlotFromOccurrence(
                  selectedSlot,
                  campusPreOrder.enabled ? "campus" : "restaurant",
                  campusPreOrder.enabled ? campusPreOrder.id || userDetails.campus : undefined
              ),
        validateCoupon: !!input.couponCode && !isDirectFlow,
    };
}

export type CheckoutFailure =
    /** An in-app order error: show the order flow's own message. */
    { kind: "direct" } | { kind: "message"; message: string; removeCoupon: boolean };

/** What to tell the customer when placing the order threw. */
export function classifyCheckoutError(
    error: { code?: string; message?: string },
    isDirectFlow: boolean
): CheckoutFailure {
    if (isDirectFlow && !/coupon/i.test(error.message || "")) return { kind: "direct" };
    if (error.code?.endsWith("resource-exhausted") || error.message?.includes("limit reached")) {
        return {
            kind: "message",
            message: "Coupon usage limit reached. Please remove it to proceed.",
            removeCoupon: true,
        };
    }
    if (error.code?.endsWith("not-found") || error.message?.includes("Invalid")) {
        return {
            kind: "message",
            message: "Invalid coupon. Please remove it to proceed.",
            removeCoupon: true,
        };
    }
    return {
        kind: "message",
        message: "Something went wrong. Please try again.",
        removeCoupon: false,
    };
}
