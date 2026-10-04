import type { z } from "zod";
import { db } from "@/lib/firebase";
import { updateDoc, addDoc, doc, collection, serverTimestamp } from "firebase/firestore";
import { FeedbackSchema } from "@/lib/schemas/feedback";
import { parsePatch } from "@/lib/schemas/patch";
import { COLLECTIONS } from "@/lib/constants";

export async function createFeedback(
    data: Omit<z.input<typeof FeedbackSchema>, "status" | "createdAt">
): Promise<string> {
    const validated = FeedbackSchema.parse({
        ...data,
        status: "new",
        createdAt: serverTimestamp(),
    });
    const docRef = await addDoc(collection(db, COLLECTIONS.FEEDBACK), validated);
    return docRef.id;
}

export async function updateFeedback(id: string, data: Record<string, unknown>): Promise<void> {
    const validated = parsePatch(FeedbackSchema, data);
    await updateDoc(doc(db, COLLECTIONS.FEEDBACK, id), validated);
}
