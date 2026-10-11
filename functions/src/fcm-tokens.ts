import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

// Tokens live at fcm_tokens/{uid}; partner devices also carry their restaurantId.

export async function getFcmTokensByUids(uids: string[]) {
    const tokens: string[] = [];
    const docs = await Promise.all(uids.map((uid) => db.collection("fcm_tokens").doc(uid).get()));

    for (const doc of docs) {
        if (doc.exists) {
            const token = doc.data()?.token;
            if (token) tokens.push(token);
        }
    }

    return tokens;
}

export async function getFcmTokensByRestaurantIds(restaurantIds: string[]) {
    const tokens: string[] = [];
    const snapshots = await Promise.all(
        restaurantIds.map((restaurantId) =>
            db.collection("fcm_tokens").where("restaurantId", "==", restaurantId).get()
        )
    );

    for (const snapshot of snapshots) {
        for (const doc of snapshot.docs) {
            const token = doc.data().token;
            if (token) tokens.push(token);
        }
    }

    return tokens;
}
