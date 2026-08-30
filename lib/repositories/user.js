import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/constants";

/**
 * The user's own document. Readable and writable only by that user — see the
 * `/users/{userId}` rule.
 *
 * @param {string} userId
 * @returns {Promise<string[]>} stored favourites, or [] when the doc is absent
 */
export async function fetchFavourites(userId) {
    if (!userId) return [];
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    return snap.exists() ? snap.data().favourites || [] : [];
}

/**
 * Replaces the favourites list. Merged, so it never disturbs anything else
 * living on the user document.
 *
 * @param {string} userId
 * @param {Array} favourites
 */
export async function saveFavourites(userId, favourites) {
    await setDoc(doc(db, COLLECTIONS.USERS, userId), { favourites }, { merge: true });
}
