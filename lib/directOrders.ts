import { ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { optimizeImage } from "@/lib/uploadImage";
import { placeDirectOrder, updateDirectOrder } from "@/lib/functions";
import type { FlowEvent, OrderLine } from "@/functions/src/order-flow";
import type { CartItem, DeliverySlot, Order, UserDetails } from "@/lib/types";

/**
 * Client side of the in-app ("direct") order flow. Every change goes through
 * the Cloud Functions, which price the order and decide who may act.
 */

export { chooseOrderFlow } from "@/functions/src/order-flow";

/** A cart line as the server needs it: menu references, never prices. */
export const toOrderLines = (cartItems: CartItem[]): OrderLine[] =>
    cartItems.map((item) => ({
        itemId: item.id,
        restaurantId: item.restaurantId as string,
        quantity: item.quantity,
        ...(item.variant ? { variantId: item.variant.id } : {}),
        ...(item.addons?.length ? { addonIds: item.addons.map((a) => a.id) } : {}),
    }));

export async function submitDirectOrder(request: {
    cartItems: CartItem[];
    customer: UserDetails;
    couponCode: string | null;
    deliverySlot: DeliverySlot | null;
}): Promise<{ id: string; orderNumber: string }> {
    const { data } = await placeDirectOrder<{ id: string; orderNumber: string }>({
        lines: toOrderLines(request.cartItems),
        customer: request.customer,
        ...(request.couponCode ? { couponCode: request.couponCode } : {}),
        ...(request.deliverySlot ? { deliverySlot: request.deliverySlot } : {}),
    });
    return data;
}

export async function sendOrderEvent(orderId: string, event: FlowEvent): Promise<void> {
    await updateDirectOrder({ orderId, event });
}

/**
 * Uploads a payment screenshot. Each upload is a new file, so a resubmission
 * after a rejection never overwrites the proof that was rejected.
 * @returns the storage path to submit with the payment
 */
export async function uploadPaymentProof(orderId: string, file: File): Promise<string> {
    const optimized = await optimizeImage(file);
    const path = `payment-proofs/${orderId}/${Date.now()}-${optimized.name.replace(/[^\w.-]/g, "_")}`;
    await uploadBytes(ref(storage, path), optimized, { contentType: optimized.type });
    return path;
}

/** A callable error as something to show the person who hit it. */
export const flowErrorMessage = (error: unknown): string => {
    const message = (error as { message?: string })?.message;
    return message && !/^(internal|INTERNAL)$/.test(message)
        ? message
        : "Something went wrong. Please try again.";
};

export const isDirectOrder = (order: Pick<Order, "flow">): boolean => order.flow === "direct";

/** The restaurants still taking part: dropped legs no longer count. */
export const activeLegIds = (order: Pick<Order, "legs">): string[] =>
    Object.entries(order.legs || {})
        .filter(([, leg]) => leg.status !== "dropped")
        .map(([id]) => id);
