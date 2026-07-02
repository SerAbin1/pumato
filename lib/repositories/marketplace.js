import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc, addDoc, collection } from "firebase/firestore";
import { MarketplaceListingSchema, MarketplaceRequestSchema } from "@/lib/schemas/marketplace";
import { COLLECTIONS } from "@/lib/constants";

export async function saveListing(id, data) {
    const validated = MarketplaceListingSchema.parse({ ...data, id });
    await setDoc(doc(db, COLLECTIONS.MARKETPLACE_LISTINGS, id), validated);
}

export async function updateListing(id, data) {
    const validated = MarketplaceListingSchema.partial().parse(data);
    await updateDoc(doc(db, COLLECTIONS.MARKETPLACE_LISTINGS, id), validated);
}

export async function deleteListing(id) {
    await deleteDoc(doc(db, COLLECTIONS.MARKETPLACE_LISTINGS, id));
}

export async function createMarketplaceRequest(data) {
    const validated = MarketplaceRequestSchema.omit({ createdAt: true }).parse(data);
    const docRef = await addDoc(collection(db, COLLECTIONS.MARKETPLACE_REQUESTS), validated);
    return docRef.id;
}

export async function updateMarketplaceRequest(id, data) {
    const validated = MarketplaceRequestSchema.partial().parse(data);
    await updateDoc(doc(db, COLLECTIONS.MARKETPLACE_REQUESTS, id), validated);
}
