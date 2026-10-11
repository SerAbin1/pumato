/**
 * The in-app ("direct") order flow for Payment Partner restaurants.
 *
 * Pure domain logic with no Firebase imports, so the Cloud Functions and the
 * web app share one source of truth for statuses, pricing and who may act.
 */

import {
    calculateDeliveryCharge,
    calculateDiscount,
    calculateItemTotal,
    calculateMinOrderShortfalls,
} from "./pricing";
import type { PricingCoupon, PricingRestaurant, PricingSettings } from "./pricing";

// --- Shapes ---

export interface FlowMenuItem {
    id: string;
    name: string;
    price: string;
    category: string;
    isVeg: boolean | null;
    isVisible: boolean;
    image?: string;
    weight?: number;
    variants?: { id: string; name: string; price: string; weight?: number }[];
    addons?: { id: string; name: string; price: string }[];
}

export interface FlowRestaurant extends PricingRestaurant {
    isPaymentPartner?: boolean;
    menu?: FlowMenuItem[];
}

/** What the customer asks for: references into a menu, never prices. */
export interface OrderLine {
    itemId: string;
    restaurantId: string;
    quantity: number;
    variantId?: string;
    addonIds?: string[];
}

export interface Customer {
    userId: string;
    name: string;
    phone: string;
    campus: string;
    address: string;
    instructions?: string;
}

export interface FlowContext {
    restaurants: FlowRestaurant[];
    settings: PricingSettings;
    coupon: (PricingCoupon & { code?: string }) | null;
}

/** An order line priced from the menu at the moment it was added. */
export interface FlowOrderItem {
    id: string;
    name: string;
    price: number;
    unitPrice: number;
    quantity: number;
    restaurantId: string;
    restaurantName: string;
    isVeg: boolean;
    category: string;
    image?: string;
    weight?: number;
    variant?: { id: string; name: string; price: number; weight?: number };
    addons?: { id: string; name: string; price: number }[];
}

export type LegStatus = "pending" | "confirmed" | "unavailable" | "dropped" | "paid" | "ready";

export interface Leg {
    status: LegStatus;
    outOfStockItems?: string[];
}

export type DirectOrderStatus =
    | "awaiting_restaurants"
    | "awaiting_customer"
    | "awaiting_payment"
    | "payment_submitted"
    | "paid"
    | "ready_for_delivery"
    | "picked_up"
    | "delivered"
    | "cancelled";

/** Who the customer pays: one restaurant pays itself, several go through Pumato. */
export type PaymentCollector = { type: "restaurant"; restaurantId: string } | { type: "pumato" };

export interface PaymentProof {
    status: "pending_verification" | "verified" | "rejected";
    /** The UTR the customer read off their UPI app. */
    transactionId: string;
    /** Storage path of the screenshot they uploaded. */
    screenshotPath: string;
}

export interface DirectOrder extends Omit<Customer, "instructions"> {
    flow: "direct";
    status: DirectOrderStatus;
    items: FlowOrderItem[];
    restaurantIds: string[];
    legs: Record<string, Leg>;
    paymentCollector?: PaymentCollector;
    payment?: PaymentProof;
    instructions?: string;
    couponCode?: string;
    total: number;
    deliveryCharge: number;
    discount: number;
    finalTotal: number;
}

// --- Which flow ---

/** Every restaurant in the cart must be a Payment Partner for the in-app flow. */
export type OrderFlow = "direct" | "whatsapp";

export function chooseOrderFlow(
    restaurantIds: string[],
    restaurants: { id: string; isPaymentPartner?: boolean }[]
): OrderFlow {
    const isPartner = (id: string) => restaurants.find((r) => r.id === id)?.isPaymentPartner;
    return restaurantIds.every(isPartner) ? "direct" : "whatsapp";
}

// --- Errors ---

export type OrderFlowErrorCode =
    | "not_payment_partner"
    | "item_unavailable"
    | "below_minimum"
    | "not_allowed"
    | "invalid_transition";

/** A request the flow refuses; `code` is stable for callers to branch on. */
export class OrderFlowError extends Error {
    readonly code: OrderFlowErrorCode;

    constructor(code: OrderFlowErrorCode, message: string = code) {
        super(message);
        this.name = "OrderFlowError";
        this.code = code;
    }
}

// --- Pricing ---

const toNumber = (v: string | number | undefined) => Number(v) || 0;

function priceLine(line: OrderLine, restaurants: FlowRestaurant[]): FlowOrderItem {
    const restaurant = restaurants.find((r) => r.id === line.restaurantId);
    const item = restaurant?.menu?.find((m) => m.id === line.itemId);
    if (!restaurant || !item || !item.isVisible) {
        throw new OrderFlowError("item_unavailable", `${line.itemId} is not available`);
    }

    const variant = item.variants?.find((v) => v.id === line.variantId);
    const addons = (item.addons || []).filter((a) => line.addonIds?.includes(a.id));
    const base = variant ? toNumber(variant.price) : toNumber(item.price);
    const unitPrice = base + addons.reduce((s, a) => s + toNumber(a.price), 0);

    return {
        id: item.id,
        name: item.name,
        price: toNumber(item.price),
        unitPrice,
        quantity: line.quantity,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        isVeg: Boolean(item.isVeg),
        category: item.category,
        ...(item.image ? { image: item.image } : {}),
        ...(item.weight !== undefined ? { weight: item.weight } : {}),
        ...(variant
            ? {
                  variant: {
                      id: variant.id,
                      name: variant.name,
                      price: toNumber(variant.price),
                      ...(variant.weight !== undefined ? { weight: variant.weight } : {}),
                  },
              }
            : {}),
        ...(addons.length > 0
            ? { addons: addons.map((a) => ({ id: a.id, name: a.name, price: toNumber(a.price) })) }
            : {}),
    };
}

/** Prices a set of lines as a brand-new order would be. */
function priceItems(items: FlowOrderItem[], campus: string, ctx: FlowContext) {
    const total = calculateItemTotal(items);
    const firstRestaurant = ctx.restaurants.find((r) => r.id === items[0]?.restaurantId);
    const { deliveryCharge } = calculateDeliveryCharge(items, ctx.settings, firstRestaurant, {
        campus,
    });
    const discount = calculateDiscount(ctx.coupon, total, items);
    return {
        total,
        deliveryCharge,
        discount,
        finalTotal: Math.max(0, total + deliveryCharge - discount),
    };
}

/** An order that changes is checked like a new one, minimum orders included. */
function assertMinimums(items: FlowOrderItem[], ctx: FlowContext) {
    const [short] = calculateMinOrderShortfalls(items, ctx.restaurants);
    if (short) {
        throw new OrderFlowError(
            "below_minimum",
            `${short.restaurantName} needs ₹${short.shortfall} more to reach its minimum order`
        );
    }
}

const uniq = (ids: string[]) => [...new Set(ids)];

// --- Placing ---

/**
 * A push notification the change calls for. Everything else the customer or a
 * restaurant needs to see reaches them in-app through the live order.
 */
export type FlowNotification =
    | { kind: "new_order" | "payment_to_verify"; to: { restaurantIds: string[] } }
    | { kind: "ready_to_pay" | "out_of_stock"; to: { userId: string } };

export interface FlowResult {
    order: DirectOrder;
    notifications: FlowNotification[];
}

export function placeOrder(
    request: { lines: OrderLine[]; customer: Customer },
    ctx: FlowContext
): FlowResult {
    const items = request.lines.map((line) => priceLine(line, ctx.restaurants));
    const restaurantIds = uniq(items.map((i) => i.restaurantId));
    if (chooseOrderFlow(restaurantIds, ctx.restaurants) !== "direct") {
        throw new OrderFlowError("not_payment_partner");
    }
    assertMinimums(items, ctx);
    const legs = Object.fromEntries(
        restaurantIds.map((id) => [id, { status: "pending" as const }])
    );

    return {
        order: {
            flow: "direct",
            status: "awaiting_restaurants",
            ...request.customer,
            items,
            restaurantIds,
            legs,
            ...(ctx.coupon?.code ? { couponCode: ctx.coupon.code } : {}),
            ...priceItems(items, request.customer.campus, ctx),
        },
        notifications: [{ kind: "new_order", to: { restaurantIds } }],
    };
}

// --- Changing an order ---

export type Actor =
    | { role: "customer"; uid: string }
    | { role: "partner"; restaurantId: string }
    | { role: "admin" };

export type FlowEvent =
    | { type: "confirm" }
    | { type: "mark_unavailable"; itemIds: string[] }
    | { type: "submit_payment"; transactionId: string; screenshotPath: string }
    | { type: "verify_payment" }
    | { type: "reject_payment" }
    | { type: "mark_ready" }
    | { type: "cancel" }
    | {
          type: "resolve";
          restaurantId: string;
          /**
           * There is no replacing: a customer who wants something else places a
           * new order.
           */
          choice: "remove" | "cancel_restaurant";
      };

/** The order's status follows from its legs and payment: it is never set directly. */
function deriveStatus(legs: Record<string, Leg>, payment?: PaymentProof): DirectOrderStatus {
    const active = Object.values(legs).filter((leg) => leg.status !== "dropped");
    if (active.length === 0) return "cancelled";
    if (active.some((leg) => leg.status === "unavailable")) return "awaiting_customer";
    if (active.some((leg) => leg.status === "pending")) return "awaiting_restaurants";
    if (payment?.status === "pending_verification") return "payment_submitted";
    if (payment?.status === "verified") {
        return active.every((leg) => leg.status === "ready") ? "ready_for_delivery" : "paid";
    }
    return "awaiting_payment";
}

const PRE_PAYMENT: DirectOrderStatus[] = ["awaiting_restaurants", "awaiting_customer", "cancelled"];

const activeLegIds = (legs: Record<string, Leg>) =>
    Object.keys(legs).filter((id) => legs[id].status !== "dropped");

/**
 * Re-derives everything that follows from the legs. The payment collector is
 * fixed by how many restaurants are left when the order reaches payment, so an
 * order that shrank to one restaurant is paid to that restaurant.
 */
function settle(order: DirectOrder, legs: Record<string, Leg>): DirectOrder {
    const { paymentCollector: _previous, ...rest } = order;
    const status = deriveStatus(legs, order.payment);
    if (PRE_PAYMENT.includes(status)) return { ...rest, legs, status };

    const remaining = activeLegIds(legs);
    const paymentCollector: PaymentCollector =
        remaining.length === 1
            ? { type: "restaurant", restaurantId: remaining[0] }
            : { type: "pumato" };
    return { ...rest, legs, status, paymentCollector };
}

/** Push notifications follow from what the change did to the order's status. */
function notificationsFor(before: DirectOrder, after: DirectOrder): FlowNotification[] {
    const notifications: FlowNotification[] = [];

    if (after.status !== before.status) {
        if (after.status === "awaiting_payment") {
            notifications.push({ kind: "ready_to_pay", to: { userId: after.userId } });
        } else if (after.status === "awaiting_customer") {
            notifications.push({ kind: "out_of_stock", to: { userId: after.userId } });
        } else if (
            after.status === "payment_submitted" &&
            after.paymentCollector?.type === "restaurant"
        ) {
            // Admins verify Pumato's collections from the dashboard; there is no admin push.
            notifications.push({
                kind: "payment_to_verify",
                to: { restaurantIds: [after.paymentCollector.restaurantId] },
            });
        }
    }
    return notifications;
}

/**
 * The leg the acting restaurant may change, provided it is in `from`.
 * @returns the restaurant id the leg is keyed by
 */
function ownLeg(order: DirectOrder, actor: Actor, from: LegStatus): string {
    if (actor.role !== "partner" || !order.legs[actor.restaurantId]) {
        throw new OrderFlowError("not_allowed");
    }
    if (order.legs[actor.restaurantId].status !== from) {
        throw new OrderFlowError("invalid_transition");
    }
    return actor.restaurantId;
}

/** The collecting restaurant verifies its own payments; admins can verify any. */
function assertCollector(order: DirectOrder, actor: Actor) {
    const collector = order.paymentCollector;
    const isCollectingRestaurant =
        actor.role === "partner" &&
        collector?.type === "restaurant" &&
        collector.restaurantId === actor.restaurantId;
    if (actor.role !== "admin" && !isCollectingRestaurant) {
        throw new OrderFlowError("not_allowed");
    }
}

function assertCustomer(order: DirectOrder, actor: Actor) {
    if (actor.role !== "customer" || actor.uid !== order.userId) {
        throw new OrderFlowError("not_allowed");
    }
}

export function applyEvent(
    order: DirectOrder,
    event: FlowEvent,
    actor: Actor,
    ctx: FlowContext
): FlowResult {
    const legs = { ...order.legs };
    let items = order.items;
    let payment = order.payment;
    switch (event.type) {
        case "confirm":
            legs[ownLeg(order, actor, "pending")] = { status: "confirmed" };
            break;
        case "mark_unavailable":
            legs[ownLeg(order, actor, "pending")] = {
                status: "unavailable",
                outOfStockItems: event.itemIds,
            };
            break;
        case "cancel":
            if (actor.role !== "admin") throw new OrderFlowError("not_allowed");
            if (["picked_up", "delivered", "cancelled"].includes(order.status)) {
                throw new OrderFlowError("invalid_transition");
            }
            for (const id of Object.keys(legs)) legs[id] = { status: "dropped" };
            break;
        case "mark_ready":
            legs[ownLeg(order, actor, "paid")] = { status: "ready" };
            break;
        case "submit_payment":
            assertCustomer(order, actor);
            if (order.status !== "awaiting_payment") throw new OrderFlowError("invalid_transition");
            payment = {
                status: "pending_verification",
                transactionId: event.transactionId,
                screenshotPath: event.screenshotPath,
            };
            break;
        case "verify_payment":
            assertCollector(order, actor);
            if (order.status !== "payment_submitted")
                throw new OrderFlowError("invalid_transition");
            payment = { ...order.payment!, status: "verified" };
            for (const id of activeLegIds(legs)) legs[id] = { status: "paid" };
            break;
        case "reject_payment":
            assertCollector(order, actor);
            if (order.status !== "payment_submitted")
                throw new OrderFlowError("invalid_transition");
            payment = { ...order.payment!, status: "rejected" };
            break;
        case "resolve": {
            assertCustomer(order, actor);
            if (order.legs[event.restaurantId]?.status !== "unavailable") {
                throw new OrderFlowError("invalid_transition");
            }
            const missing = order.legs[event.restaurantId]?.outOfStockItems || [];
            const goes = (i: FlowOrderItem) =>
                i.restaurantId === event.restaurantId &&
                (event.choice === "cancel_restaurant" || missing.includes(i.id));
            items = items.filter((i) => !goes(i));
            const left = items.some((i) => i.restaurantId === event.restaurantId);
            legs[event.restaurantId] = { status: left ? "confirmed" : "dropped" };
            break;
        }
    }
    if (items !== order.items) assertMinimums(items, ctx);
    const repriced =
        items === order.items
            ? order
            : { ...order, items, ...priceItems(items, order.campus, ctx) };
    const next = settle({ ...repriced, ...(payment ? { payment } : {}) }, legs);
    return { order: next, notifications: notificationsFor(order, next) };
}
