import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { RestaurantSchema } from "@/lib/schemas/restaurant";
import { COLLECTIONS } from "@/lib/constants";

export async function saveRestaurant(id, data) {
    const validated = RestaurantSchema.parse({ ...data, id });
    await setDoc(doc(db, COLLECTIONS.RESTAURANTS, id), validated);
}

export async function updateRestaurant(id, data) {
    const validated = RestaurantSchema.partial().parse(data);
    await updateDoc(doc(db, COLLECTIONS.RESTAURANTS, id), validated);
}

export async function deleteRestaurant(id) {
    await deleteDoc(doc(db, COLLECTIONS.RESTAURANTS, id));
}
