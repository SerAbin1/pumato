import type { z } from "zod";
import { db } from "@/lib/firebase";
import {
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    collection,
    serverTimestamp,
} from "firebase/firestore";
import { MarketplaceListingSchema, MarketplaceRequestSchema } from "@/lib/schemas/marketplace";
import { parsePatch } from "@/lib/schemas/patch";
import { COLLECTIONS } from "@/lib/constants";

export async function saveListing(
    id: string,
    data: Omit<z.input<typeof MarketplaceListingSchema>, "id">
): Promise<void> {
    const validated = MarketplaceListingSchema.parse({
        ...data,
        id,
        createdAt: data.createdAt || serverTimestamp(),
    });
    await setDoc(doc(db, COLLECTIONS.MARKETPLACE_LISTINGS, id), validated);
}

export async function updateListing(id: string, data: Record<string, unknown>): Promise<void> {
    const validated = parsePatch(MarketplaceListingSchema, data);
    await updateDoc(doc(db, COLLECTIONS.MARKETPLACE_LISTINGS, id), validated);
}

export async function deleteListing(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.MARKETPLACE_LISTINGS, id));
}

export async function createMarketplaceRequest(
    data: Omit<z.input<typeof MarketplaceRequestSchema>, "createdAt">
): Promise<string> {
    const validated = MarketplaceRequestSchema.omit({ createdAt: true }).parse(data);
    const docRef = await addDoc(collection(db, COLLECTIONS.MARKETPLACE_REQUESTS), validated);
    return docRef.id;
}

export async function updateMarketplaceRequest(
    id: string,
    data: Record<string, unknown>
): Promise<void> {
    const validated = parsePatch(MarketplaceRequestSchema, data);
    await updateDoc(doc(db, COLLECTIONS.MARKETPLACE_REQUESTS, id), validated);
}
