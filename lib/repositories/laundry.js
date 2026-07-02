import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, addDoc, collection } from "firebase/firestore";
import { LaundryOrderSchema } from "@/lib/schemas/laundry";
import { COLLECTIONS } from "@/lib/constants";

export async function createLaundryOrder(data) {
    const validated = LaundryOrderSchema.omit({ id: true, createdAt: true }).parse(data);
    const docRef = await addDoc(collection(db, COLLECTIONS.LAUNDRY_ORDERS), validated);
    return docRef.id;
}

export async function updateLaundryOrder(id, data) {
    const validated = LaundryOrderSchema.partial().parse(data);
    await updateDoc(doc(db, COLLECTIONS.LAUNDRY_ORDERS, id), validated);
}

export async function deleteLaundryOrder(id) {
    await deleteDoc(doc(db, COLLECTIONS.LAUNDRY_ORDERS, id));
}
