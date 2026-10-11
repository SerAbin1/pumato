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
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
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
    return onSnapshot(
        userOrdersQuery(userId, max),
        (snap) =>
            onChange(
                snap.docs.map(
                    (d) =>
                        ({
                            id: d.id,
                            ...d.data(),
                            createdAt: d.data().createdAt?.toDate?.() ?? null,
                        }) as UserOrderRecord
                )
            ),
        onError
    );
}

export async function fetchUserOrders(
    userId: string | null | undefined,
    max = 50
): Promise<UserOrderRecord[]> {
    if (!userId) return [];

    const snap = await getDocs(userOrdersQuery(userId, max));

    return snap.docs.map(
        (d) =>
            ({
                id: d.id,
                ...d.data(),
                createdAt: d.data().createdAt?.toDate?.() ?? null,
            }) as UserOrderRecord
    );
}
