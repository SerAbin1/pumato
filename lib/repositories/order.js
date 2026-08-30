import { db } from "@/lib/firebase";
import { doc, updateDoc, collection, runTransaction } from "firebase/firestore";
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
