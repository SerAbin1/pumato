import { useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, query } from "firebase/firestore";

export default function useFirestore() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getCollection = useCallback(async (collectionPath, queryConfig = []) => {
        setLoading(true);
        setError(null);
        try {
            let q = collection(db, collectionPath);

            if (queryConfig.length > 0) {
                q = query(q, ...queryConfig);
            }

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            return data;
        } catch (err) {
            console.error(`Error fetching collection ${collectionPath}:`, err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getDocument = useCallback(async (collectionPath, docId) => {
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, collectionPath, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (err) {
            console.error(`Error fetching document ${collectionPath}/${docId}:`, err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        getCollection,
        getDocument,
    };
}
