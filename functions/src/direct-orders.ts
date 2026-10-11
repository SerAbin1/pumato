import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import type { DocumentReference, Transaction } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { applyEvent, OrderFlowError, placeOrder } from "./order-flow";
import type {
    Actor,
    DirectOrder,
    FlowContext,
    FlowEvent,
    FlowNotification,
    FlowRestaurant,
    OrderLine,
} from "./order-flow";
import { getFcmTokensByRestaurantIds, getFcmTokensByUids } from "./fcm-tokens";

/**
 * Callables for in-app ("direct") orders. Every change runs through the
 * order-flow module inside a transaction, so prices and statuses are always
 * computed here; security rules keep clients from writing direct orders.
 */

const db = getFirestore();
const messaging = getMessaging();

type StoredOrder = DirectOrder & { orderNumber?: string };

// --- Who is calling ---

function actorOf(request: CallableRequest): Actor {
    const auth = request.auth;
    if (!auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
    if (auth.token.admin === true) return { role: "admin" };
    if (typeof auth.token.restaurantId === "string" && auth.token.restaurantId) {
        return { role: "partner", restaurantId: auth.token.restaurantId };
    }
    return { role: "customer", uid: auth.uid };
}

// --- Input checks (callables are reachable by anyone signed in) ---

const isString = (v: unknown, max = 200): v is string =>
    typeof v === "string" && v.length > 0 && v.length <= max;

const isStringList = (v: unknown, max = 50): v is string[] =>
    Array.isArray(v) && v.length <= max && v.every((s) => isString(s));

function parseLines(value: unknown): OrderLine[] {
    if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
        throw new HttpsError("invalid-argument", "The order has no items.");
    }
    return value.map((raw) => {
        const line = (raw ?? {}) as Record<string, unknown>;
        const quantity = Number(line.quantity);
        if (
            !isString(line.itemId) ||
            !isString(line.restaurantId) ||
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 50 ||
            (line.variantId !== undefined && !isString(line.variantId)) ||
            (line.addonIds !== undefined && !isStringList(line.addonIds))
        ) {
            throw new HttpsError("invalid-argument", "An item in the order is malformed.");
        }
        return {
            itemId: line.itemId,
            restaurantId: line.restaurantId,
            quantity,
            ...(line.variantId ? { variantId: line.variantId as string } : {}),
            ...(line.addonIds ? { addonIds: line.addonIds as string[] } : {}),
        };
    });
}

// Same rule as lib/upi.ts: the apps disagree on format, so accept a broad range.
const TRANSACTION_ID_PATTERN = /^[A-Z0-9]{8,35}$/;

function parseEvent(value: unknown, orderId: string): FlowEvent {
    const event = (value ?? {}) as Record<string, unknown>;
    switch (event.type) {
        case "confirm":
        case "verify_payment":
        case "reject_payment":
        case "mark_ready":
        case "cancel":
            return { type: event.type };
        case "mark_unavailable":
            if (!isStringList(event.itemIds) || event.itemIds.length === 0) break;
            return { type: "mark_unavailable", itemIds: event.itemIds };
        case "submit_payment": {
            const transactionId = String(event.transactionId ?? "")
                .trim()
                .toUpperCase();
            const path = event.screenshotPath;
            if (!TRANSACTION_ID_PATTERN.test(transactionId)) {
                throw new HttpsError(
                    "invalid-argument",
                    "That doesn't look like a UPI transaction ID."
                );
            }
            if (!isString(path, 500) || !path.startsWith(`payment-proofs/${orderId}/`)) {
                throw new HttpsError("invalid-argument", "Upload the payment screenshot first.");
            }
            return { type: "submit_payment", transactionId, screenshotPath: path };
        }
        case "resolve": {
            const choice = event.choice;
            if (
                !isString(event.restaurantId) ||
                (choice !== "remove" && choice !== "cancel_restaurant" && choice !== "replace")
            ) {
                break;
            }
            return {
                type: "resolve",
                restaurantId: event.restaurantId,
                choice,
                ...(choice === "replace" ? { replacements: parseLines(event.replacements) } : {}),
            };
        }
    }
    throw new HttpsError("invalid-argument", "Unknown order action.");
}

// --- Loading what the flow needs ---

interface StoredCoupon {
    code: string;
    type?: string;
    value?: string | number;
    min_order?: string | number;
    item_id?: string | null;
    is_active?: boolean;
    usage_limit?: number;
    used_count?: number;
}

async function loadContext(
    tx: Transaction,
    restaurantIds: string[],
    couponCode: string | undefined
): Promise<{ ctx: FlowContext; couponRef: DocumentReference | null; coupon: StoredCoupon | null }> {
    const refs = [...new Set(restaurantIds)].map((id) => db.collection("restaurants").doc(id));
    const restaurantSnaps = refs.length > 0 ? await tx.getAll(...refs) : [];
    const settingsSnap = await tx.get(db.collection("site_content").doc("order_settings"));

    let coupon: StoredCoupon | null = null;
    let couponRef: DocumentReference | null = null;
    if (couponCode) {
        const snap = await tx.get(
            db.collection("promocodes").where("code", "==", couponCode.toUpperCase()).limit(1)
        );
        if (!snap.empty) {
            coupon = snap.docs[0].data() as StoredCoupon;
            couponRef = snap.docs[0].ref;
        }
    }

    const restaurants = restaurantSnaps
        .filter((s) => s.exists)
        .map((s) => ({ ...s.data(), id: s.id }) as FlowRestaurant);

    return {
        ctx: { restaurants, settings: settingsSnap.data() ?? null, coupon },
        couponRef,
        coupon,
    };
}

// --- Errors ---

function toHttpsError(error: unknown): never {
    if (error instanceof OrderFlowError) {
        const code =
            error.code === "not_allowed"
                ? "permission-denied"
                : error.code === "invalid_transition"
                  ? "failed-precondition"
                  : "invalid-argument";
        throw new HttpsError(code, error.message, { reason: error.code });
    }
    throw error;
}

// --- Notifications ---

function messageFor(n: FlowNotification, order: StoredOrder) {
    const ref = order.orderNumber ? `#${order.orderNumber}` : "Your order";
    switch (n.kind) {
        case "new_order":
            return {
                title: "New Order Received",
                body: `Order ${ref} is waiting for you to confirm it.`,
                targetUrl: "/partner",
            };
        case "payment_to_verify":
            return {
                title: "Payment to verify",
                body: `Order ${ref}: check the ₹${order.finalTotal} payment and confirm it.`,
                targetUrl: "/partner",
            };
        case "ready_to_pay":
            return {
                title: "Ready to pay",
                body: `${ref} is confirmed. Pay ₹${order.finalTotal} to get it started.`,
                targetUrl: "/orders",
            };
        case "out_of_stock":
            return {
                title: "Some items are unavailable",
                body: `${ref}: choose what to do about the missing items.`,
                targetUrl: "/orders",
            };
    }
}

async function sendNotifications(
    notifications: FlowNotification[],
    order: StoredOrder,
    orderId: string
) {
    await Promise.allSettled(
        notifications.map(async (n) => {
            const tokens =
                "userId" in n.to
                    ? await getFcmTokensByUids([n.to.userId])
                    : await getFcmTokensByRestaurantIds(n.to.restaurantIds);
            const data = { ...messageFor(n, order), orderId };
            await Promise.allSettled(
                tokens.map((token) =>
                    messaging.send({
                        token,
                        data,
                        webpush: {
                            headers: { Urgency: "high", TTL: "300" },
                            notification: {
                                title: data.title,
                                body: data.body,
                                icon: "/android-chrome-192x192.png",
                                badge: "/favicon-32x32.png",
                                tag: `order-${orderId}`,
                                renotify: true,
                                data,
                            },
                        },
                    })
                )
            );
        })
    );
}

// --- Callables ---

interface PlaceRequest {
    lines?: unknown;
    customer?: Record<string, unknown>;
    couponCode?: unknown;
    deliverySlot?: unknown;
}

export const placeDirectOrder = onCall<PlaceRequest>(async (request) => {
    const actor = actorOf(request);
    if (actor.role !== "customer") {
        throw new HttpsError("permission-denied", "Only customers can place orders.");
    }

    const lines = parseLines(request.data.lines);
    const details = request.data.customer ?? {};
    if (!isString(details.name) || !isString(details.phone, 20) || !isString(details.campus)) {
        throw new HttpsError("invalid-argument", "Add your name, phone and campus.");
    }
    const customer = {
        userId: actor.uid,
        name: details.name,
        phone: details.phone,
        campus: details.campus,
        address: typeof details.address === "string" ? details.address.slice(0, 500) : "",
        ...(typeof details.instructions === "string" && details.instructions
            ? { instructions: details.instructions.slice(0, 500) }
            : {}),
    };
    const couponCode = isString(request.data.couponCode, 50) ? request.data.couponCode : undefined;
    const deliverySlot =
        request.data.deliverySlot && typeof request.data.deliverySlot === "object"
            ? request.data.deliverySlot
            : undefined;

    const orderRef = db.collection("orders").doc();
    const counterRef = db.collection("counters").doc("orders");

    const { order, notifications } = await db.runTransaction(async (tx) => {
        const { ctx, coupon, couponRef } = await loadContext(
            tx,
            lines.map((l) => l.restaurantId),
            couponCode
        );
        if (couponCode) {
            const limit = coupon?.usage_limit || 0;
            if (!coupon || coupon.is_active === false || limit < 1) {
                throw new HttpsError("invalid-argument", "Invalid coupon code.");
            }
            if ((coupon.used_count || 0) >= limit) {
                throw new HttpsError("resource-exhausted", "Coupon usage limit reached.");
            }
        }
        const counterSnap = await tx.get(counterRef);

        let result;
        try {
            result = placeOrder({ lines, customer }, ctx);
        } catch (error) {
            toHttpsError(error);
        }

        const next = (Number(counterSnap.data()?.last) || 0) + 1;
        const stored: StoredOrder = {
            ...result.order,
            orderNumber: `ORD-${String(next).padStart(4, "0")}`,
        };
        tx.set(counterRef, { last: next });
        tx.set(orderRef, {
            ...stored,
            ...(deliverySlot ? { deliverySlot } : {}),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        if (couponRef) tx.update(couponRef, { used_count: FieldValue.increment(1) });
        return { order: stored, notifications: result.notifications };
    });

    await sendNotifications(notifications, order, orderRef.id);
    return { id: orderRef.id, orderNumber: order.orderNumber };
});

export const updateDirectOrder = onCall<{ orderId?: unknown; event?: unknown }>(async (request) => {
    const actor = actorOf(request);
    if (!isString(request.data.orderId)) {
        throw new HttpsError("invalid-argument", "Which order?");
    }
    const orderId = request.data.orderId;
    const event = parseEvent(request.data.event, orderId);
    const orderRef = db.collection("orders").doc(orderId);

    const { order, notifications } = await db.runTransaction(async (tx) => {
        const snap = await tx.get(orderRef);
        const current = snap.data() as StoredOrder | undefined;
        if (!current || current.flow !== "direct") {
            throw new HttpsError("not-found", "Order not found.");
        }

        const replacementIds =
            event.type === "resolve" ? (event.replacements || []).map((l) => l.restaurantId) : [];
        const { ctx } = await loadContext(
            tx,
            [...current.restaurantIds, ...replacementIds],
            current.couponCode
        );

        let result;
        try {
            result = applyEvent(current, event, actor, ctx);
        } catch (error) {
            toHttpsError(error);
        }

        // Items a restaurant ran out of come off its menu, as on the WhatsApp flow.
        if (event.type === "mark_unavailable" && actor.role === "partner") {
            const restaurant = ctx.restaurants.find((r) => r.id === actor.restaurantId);
            if (restaurant?.menu) {
                const hiddenAt = new Date().toISOString();
                tx.update(db.collection("restaurants").doc(restaurant.id), {
                    menu: restaurant.menu.map((item) =>
                        event.itemIds.includes(item.id)
                            ? { ...item, isVisible: false, hiddenAt }
                            : item
                    ),
                });
            }
        }

        const next = result.order as StoredOrder;
        tx.set(orderRef, {
            ...next,
            updatedAt: FieldValue.serverTimestamp(),
            ...(next.status === "ready_for_delivery" && current.status !== "ready_for_delivery"
                ? { readyAt: FieldValue.serverTimestamp() }
                : {}),
        });
        return { order: next, notifications: result.notifications };
    });

    await sendNotifications(notifications, order, orderId);
    return { status: order.status };
});
