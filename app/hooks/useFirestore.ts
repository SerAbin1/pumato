import { useState, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, getDoc, doc, query } from "firebase/firestore";
import type { Query, QueryConstraint } from "firebase/firestore";
import type { AnyRecord } from "@/lib/types";

export default function useFirestore() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCollection = useCallback(
        async <T = AnyRecord>(
            collectionPath: string,
            queryConfig: QueryConstraint[] = []
        ): Promise<(T & { id: string })[]> => {
            setLoading(true);
            setError(null);
            try {
                let q: Query = collection(db, collectionPath);

                if (queryConfig.length > 0) {
                    q = query(q, ...queryConfig);
                }

                const querySnapshot = await getDocs(q);
                return querySnapshot.docs.map(
                    (doc) =>
                        ({
                            id: doc.id,
                            ...doc.data(),
                        }) as T & { id: string }
                );
            } catch (err) {
                console.error(`Error fetching collection ${collectionPath}:`, err);
                setError((err as Error).message);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    const getDocument = useCallback(
        async <T = AnyRecord>(
            collectionPath: string,
            docId: string
        ): Promise<(T & { id: string }) | null> => {
            setLoading(true);
            setError(null);
            try {
                const docRef = doc(db, collectionPath, docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    return { id: docSnap.id, ...docSnap.data() } as T & { id: string };
                } else {
                    return null;
                }
            } catch (err) {
                console.error(`Error fetching document ${collectionPath}/${docId}:`, err);
                setError((err as Error).message);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        []
    );

    return {
        loading,
        error,
        getCollection,
        getDocument,
    };
}
