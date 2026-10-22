import type { z } from "zod";
import type { Order } from "@/lib/types";
import { db } from "@/lib/firebase";
import {
    doc,
    updateDoc,
    collection,
    runTransaction,
    query,
    where,
    orderBy,
    limit as limitTo,
    getDocs,
    onSnapshot,
    Timestamp,
} from "firebase/firestore";
import type { DocumentData, Query, QueryDocumentSnapshot, Unsubscribe } from "firebase/firestore";
import { OrderSchema } from "@/lib/schemas/order";
import { parsePatch } from "@/lib/schemas/patch";
import { formatOrderNumber } from "@/lib/formatters";
import { COLLECTIONS, COUNTER_DOCS } from "@/lib/constants";

export async function createOrder(
    data: z.input<typeof OrderSchema>
): Promise<{ id: string; orderNumber: string }> {
    const validated = OrderSchema.parse(data);

    const counterRef = doc(db, COLLECTIONS.COUNTERS, COUNTER_DOCS.ORDERS);
    const orderRef = doc(collection(db, COLLECTIONS.ORDERS));

    // Counter bump and order write land atomically, so two concurrent checkouts
    // can never be handed the same number.
    // Reassigned on retry, so the value that survives is the one that committed.
    let orderNumber = "";
    await runTransaction(db, async (tx) => {
        const counterSnap = await tx.get(counterRef);
        const last = counterSnap.exists() ? Number(counterSnap.data().last) || 0 : 0;
        const next = last + 1;

        orderNumber = formatOrderNumber(next);

        // Security rules allow only a `last` +1 bump, so write the field alone (no merge).
        tx.set(counterRef, { last: next });
        tx.set(orderRef, { ...validated, orderNumber });
    });

    return { id: orderRef.id, orderNumber };
}

export async function updateOrder(id: string, data: object): Promise<void> {
    const validated = parsePatch(OrderSchema, data);
    await updateDoc(doc(db, COLLECTIONS.ORDERS, id), validated);
}

type Doc = QueryDocumentSnapshot<DocumentData>;

/** A snapshot doc with its `id` attached and `createdAt` read as a Date. */
function toOrderRecord<T>(d: Doc): T {
    const data = d.data();
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() ?? null } as T;
}

/**
 * Runs `q` live. Each snapshot hands over the mapped orders that pass `keep`,
 * plus the ids the snapshot reports as added. The first snapshot reports every
 * doc as added, so callers that only chime on new orders skip it.
 */
function listen<T extends { id: string }>(
    q: Query,
    onChange: (orders: T[], addedIds: string[]) => void,
    onError: (error: Error) => void,
    {
        keep = () => true,
        map = toOrderRecord<T>,
    }: { keep?: (o: T) => boolean; map?: (d: Doc) => T } = {}
): Unsubscribe {
    return onSnapshot(
        q,
        (snap) => {
            const orders = snap.docs.map(map).filter(keep);
            const kept = new Set(orders.map((o) => o.id));
            const addedIds = snap
                .docChanges()
                .filter((c) => c.type === "added" && kept.has(c.doc.id))
                .map((c) => c.doc.id);
            onChange(orders, addedIds);
        },
        onError
    );
}

/**
 * A signed-in customer's own orders, newest first.
 * Security rules only return orders whose `userId` matches the caller.
 *
 * Needs the composite index on (userId asc, createdAt desc) declared in
 * firestore.indexes.json.
 *
 * @returns orders with `id` and `createdAt` as a Date
 */
type UserOrderRecord = Omit<Order, "createdAt"> & { createdAt: Date | null };

const userOrdersQuery = (userId: string, max: number) =>
    query(
        collection(db, COLLECTIONS.ORDERS),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limitTo(max)
    );

/**
 * Live version of fetchUserOrders, so in-app orders update as restaurants and
 * payment verifiers act on them.
 */
export function subscribeUserOrders(
    userId: string,
    onChange: (orders: UserOrderRecord[]) => void,
    onError: (error: Error) => void,
    max = 50
): Unsubscribe {
    return listen<UserOrderRecord>(
        userOrdersQuery(userId, max),
        (orders) => onChange(orders),
        onError
    );
}

export async function fetchUserOrders(
    userId: string | null | undefined,
    max = 50
): Promise<UserOrderRecord[]> {
    if (!userId) return [];

    const snap = await getDocs(userOrdersQuery(userId, max));

    return snap.docs.map((d) => toOrderRecord<UserOrderRecord>(d));
}

const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return Timestamp.fromDate(d);
};
const lastDay = () => Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

const isDirect = (o: Order) => o.flow === "direct";
const notDirect = (o: Order) => o.flow !== "direct";

type OrdersListener = (orders: Order[], addedIds: string[]) => void;

export type PartnerOrdersView = "live" | "past" | "direct";

/**
 * A restaurant's orders for one partner dashboard list:
 * - `live`: today's confirmed / viewed WhatsApp orders, oldest first
 * - `past`: today's handed-off WhatsApp orders, newest first
 * - `direct`: in-app orders from the last day, newest first. Filtered here rather
 *   than in the query so the existing (restaurantIds, createdAt) index serves it.
 */
export function subscribePartnerOrders(
    restaurantId: string,
    view: PartnerOrdersView,
    onChange: OrdersListener,
    onError: (error: Error) => void
): Unsubscribe {
    const forRestaurant = where("restaurantIds", "array-contains", restaurantId);
    const orders = collection(db, COLLECTIONS.ORDERS);

    switch (view) {
        case "live":
            return listen(
                query(
                    orders,
                    forRestaurant,
                    where("status", "in", ["confirmed", "viewed"]),
                    where("createdAt", ">=", startOfToday()),
                    orderBy("createdAt", "asc"),
                    limitTo(100)
                ),
                onChange,
                onError,
                // In-app orders never take these statuses, but keep the lists apart regardless.
                { keep: notDirect }
            );
        case "past":
            return listen(
                query(
                    orders,
                    forRestaurant,
                    where("status", "in", [
                        "ready_for_delivery",
                        "out_of_stock",
                        "picked_up",
                        "delivered",
                    ]),
                    where("createdAt", ">=", startOfToday()),
                    orderBy("createdAt", "desc"),
                    limitTo(100)
                ),
                onChange,
                onError,
                { keep: notDirect }
            );
        case "direct":
            return listen(
                query(
                    orders,
                    forRestaurant,
                    where("createdAt", ">=", lastDay()),
                    orderBy("createdAt", "desc"),
                    limitTo(200)
                ),
                onChange,
                onError,
                { keep: isDirect }
            );
    }
}

export type AdminOrdersView = "placed" | "inProgress" | "past" | "direct";

/**
 * All restaurants' orders for one admin dashboard list:
 * - `placed`: today's orders awaiting confirmation, oldest first
 * - `inProgress`: today's confirmed / viewed / ready / out-of-stock WhatsApp orders, oldest first
 * - `past`: today's picked-up / delivered WhatsApp orders, newest first
 * - `direct`: in-app orders from the last day, any status, newest first
 */
export function subscribeAdminOrders(
    view: AdminOrdersView,
    onChange: OrdersListener,
    onError: (error: Error) => void
): Unsubscribe {
    const orders = collection(db, COLLECTIONS.ORDERS);

    switch (view) {
        case "placed":
            return listen(
                query(
                    orders,
                    where("status", "==", "placed"),
                    where("createdAt", ">=", startOfToday()),
                    orderBy("createdAt", "asc")
                ),
                onChange,
                onError
            );
        case "inProgress":
            return listen(
                query(
                    orders,
                    where("status", "in", [
                        "confirmed",
                        "viewed",
                        "ready_for_delivery",
                        "out_of_stock",
                    ]),
                    where("createdAt", ">=", startOfToday()),
                    orderBy("createdAt", "asc")
                ),
                onChange,
                onError,
                // In-app orders have their own sub-tab.
                { keep: notDirect }
            );
        case "past":
            return listen(
                query(
                    orders,
                    where("status", "in", ["picked_up", "delivered"]),
                    where("createdAt", ">=", startOfToday()),
                    orderBy("createdAt", "desc")
                ),
                onChange,
                onError,
                { keep: notDirect }
            );
        case "direct":
            return listen(
                query(
                    orders,
                    where("flow", "==", "direct"),
                    where("createdAt", ">=", lastDay()),
                    orderBy("createdAt", "desc")
                ),
                onChange,
                onError
            );
    }
}

export type DeliveryOrdersView = "ready" | "mine";

/**
 * Orders for one delivery partner dashboard list:
 * - `ready`: today's orders waiting for pickup or on the road, oldest first,
 *   with `readyAt` read as a Date for the countdown
 * - `mine`: today's orders this partner (`uid`) picked up or delivered, newest first
 */
export function subscribeDeliveryOrders(
    uid: string,
    view: DeliveryOrdersView,
    onChange: OrdersListener,
    onError: (error: Error) => void
): Unsubscribe {
    const orders = collection(db, COLLECTIONS.ORDERS);

    switch (view) {
        case "ready":
            return listen(
                query(
                    orders,
                    where("status", "in", ["ready_for_delivery", "picked_up"]),
                    where("createdAt", ">=", startOfToday()),
                    orderBy("createdAt", "asc"),
                    limitTo(50)
                ),
                onChange,
                onError,
                {
                    map: (d) => {
                        const { readyAt } = d.data();
                        return {
                            ...toOrderRecord<Order>(d),
                            readyAt: readyAt?.toDate ? readyAt.toDate() : readyAt,
                        };
                    },
                }
            );
        case "mine":
            return listen(
                query(
                    orders,
                    where("deliveryPartnerUid", "==", uid),
                    where("status", "in", ["picked_up", "delivered"]),
                    where("createdAt", ">=", startOfToday()),
                    orderBy("createdAt", "desc"),
                    limitTo(50)
                ),
                onChange,
                onError
            );
    }
}
