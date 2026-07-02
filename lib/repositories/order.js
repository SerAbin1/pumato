import { db } from "@/lib/firebase";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { OrderSchema } from "@/lib/schemas/order";
import { COLLECTIONS } from "@/lib/constants";

export async function createOrder(data) {
    const validated = OrderSchema.partial().parse(data);
    const docRef = await addDoc(collection(db, COLLECTIONS.ORDERS), validated);
    return docRef.id;
}

export async function updateOrder(id, data) {
    const validated = OrderSchema.partial().parse(data);
    await updateDoc(doc(db, COLLECTIONS.ORDERS, id), validated);
}
