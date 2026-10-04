import type { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { RestaurantSchema } from "@/lib/schemas/restaurant";
import { parsePatch } from "@/lib/schemas/patch";
import { COLLECTIONS } from "@/lib/constants";

export async function saveRestaurant(
    id: string,
    data: Omit<z.input<typeof RestaurantSchema>, "id">
): Promise<void> {
    const validated = RestaurantSchema.parse({ ...data, id });
    await setDoc(doc(db, COLLECTIONS.RESTAURANTS, id), validated);
}

export async function updateRestaurant(id: string, data: object): Promise<void> {
    const validated = parsePatch(RestaurantSchema, data);
    await updateDoc(doc(db, COLLECTIONS.RESTAURANTS, id), validated);
}

export async function deleteRestaurant(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.RESTAURANTS, id));
}
