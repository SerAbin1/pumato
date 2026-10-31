import type { z } from "zod";
import { db } from "@/lib/firebase";
import {
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    collection,
    onSnapshot,
    serverTimestamp,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { LaundryOrderSchema } from "@/lib/schemas/laundry";
import { parsePatch } from "@/lib/schemas/patch";
import { COLLECTIONS } from "@/lib/constants";
import type { LaundryOrder } from "@/lib/types";

export async function createLaundryOrder(
    data: Omit<z.input<typeof LaundryOrderSchema>, "id" | "createdAt">
): Promise<string> {
    const validated = LaundryOrderSchema.omit({ id: true, createdAt: true }).parse(data);
    // Stamped after parsing: the schema omits createdAt, so a caller-supplied one is stripped.
    const docRef = await addDoc(collection(db, COLLECTIONS.LAUNDRY_ORDERS), {
        ...validated,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateLaundryOrder(id: string, data: object): Promise<void> {
    const validated = parsePatch(LaundryOrderSchema, data);
    await updateDoc(doc(db, COLLECTIONS.LAUNDRY_ORDERS, id), validated);
}

export async function deleteLaundryOrder(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.LAUNDRY_ORDERS, id));
}

/** A laundry order as the admin list reads it: `createdAt` already a Date. */
export type LaundryOrderRecord = LaundryOrder & { id: string; createdAt: Date | null };

/** Pickup day, then newest booking first within the day. */
export const sortLaundryOrders = <T extends { scheduledDate?: string; createdAt: Date | null }>(
    orders: T[]
): T[] =>
    [...orders].sort((a, b) => {
        const dateCompare = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    });

/** Admin: every laundry order, grouped by pickup day. */
export function subscribeLaundryOrders(
    onChange: (orders: LaundryOrderRecord[]) => void,
    onError: (error: Error) => void
): Unsubscribe {
    return onSnapshot(
        collection(db, COLLECTIONS.LAUNDRY_ORDERS),
        (snap) =>
            onChange(
                sortLaundryOrders(
                    snap.docs.map((d) => {
                        const data = d.data();
                        return {
                            ...data,
                            id: d.id,
                            createdAt: data.createdAt?.toDate?.() ?? null,
                        } as LaundryOrderRecord;
                    })
                )
            ),
        onError
    );
}
