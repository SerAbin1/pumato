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
} from "firebase/firestore";
import { OrderSchema } from "@/lib/schemas/order";
import { formatOrderNumber } from "@/lib/formatters";
import { COLLECTIONS, COUNTER_DOCS } from "@/lib/constants";

export async function createOrder(data) {
    const validated = OrderSchema.parse(data);

    const counterRef = doc(db, COLLECTIONS.COUNTERS, COUNTER_DOCS.ORDERS);
    const orderRef = doc(collection(db, COLLECTIONS.ORDERS));

    // Counter bump and order write land atomically, so two concurrent checkouts
    // can never be handed the same number.
    // Reassigned on retry, so the value that survives is the one that committed.
    let orderNumber;
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

export async function updateOrder(id, data) {
    const validated = OrderSchema.partial().parse(data);
    await updateDoc(doc(db, COLLECTIONS.ORDERS, id), validated);
}

/**
 * A signed-in customer's own orders, newest first.
 * Security rules only return orders whose `userId` matches the caller.
 *
 * Needs the composite index on (userId asc, createdAt desc) declared in
 * firestore.indexes.json.
 *
 * @param {string} userId
 * @param {number} [max]
 * @returns {Promise<Array>} orders with `id` and `createdAt` as a Date
 */
export async function fetchUserOrders(userId, max = 50) {
    if (!userId) return [];

    const snap = await getDocs(
        query(
            collection(db, COLLECTIONS.ORDERS),
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
            limitTo(max)
        )
    );

    return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? null,
    }));
}
