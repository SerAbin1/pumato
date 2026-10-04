import type { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, addDoc, collection } from "firebase/firestore";
import { LaundryOrderSchema } from "@/lib/schemas/laundry";
import { parsePatch } from "@/lib/schemas/patch";
import { COLLECTIONS } from "@/lib/constants";

export async function createLaundryOrder(
    data: Omit<z.input<typeof LaundryOrderSchema>, "id" | "createdAt">
): Promise<string> {
    const validated = LaundryOrderSchema.omit({ id: true, createdAt: true }).parse(data);
    const docRef = await addDoc(collection(db, COLLECTIONS.LAUNDRY_ORDERS), validated);
    return docRef.id;
}

export async function updateLaundryOrder(id: string, data: Record<string, unknown>): Promise<void> {
    const validated = parsePatch(LaundryOrderSchema, data);
    await updateDoc(doc(db, COLLECTIONS.LAUNDRY_ORDERS, id), validated);
}

export async function deleteLaundryOrder(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.LAUNDRY_ORDERS, id));
}
