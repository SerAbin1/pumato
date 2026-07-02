import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { OrderSchema } from "@/lib/schemas/order";
import { COLLECTIONS } from "@/lib/constants";

export async function updateOrder(id, data) {
    const validated = OrderSchema.partial().parse(data);
    await updateDoc(doc(db, COLLECTIONS.ORDERS, id), validated);
}
