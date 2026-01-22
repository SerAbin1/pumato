import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
    collection,
    getDocs,
    getDoc,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit as firestoreLimit
} from 'firebase/firestore';

/**
 * Custom hook for generic Firestore operations
 */
export default function useFirestore() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch multiple documents from a collection
    const getCollection = useCallback(async (collectionPath, queryConfig = []) => {
        setLoading(true);
        setError(null);
        try {
            let q = collection(db, collectionPath);

            // Apply query configurations (where, orderBy, limit)
            if (queryConfig.length > 0) {
                q = query(q, ...queryConfig);
            }

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
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

    // Fetch a single document by ID
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

    // Add a new document to a collection (auto-generated ID)
    const addDocument = useCallback(async (collectionPath, data) => {
        setLoading(true);
        setError(null);
        try {
            const docRef = await addDoc(collection(db, collectionPath), data);
            return docRef.id;
        } catch (err) {
            console.error(`Error adding document to ${collectionPath}:`, err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Set a document with a specific ID
    const setDocument = useCallback(async (collectionPath, docId, data, options = {}) => {
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, collectionPath, docId);
            await setDoc(docRef, data, options);
            return true;
        } catch (err) {
            console.error(`Error setting document ${collectionPath}/${docId}:`, err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Update specific fields of a document
    const updateDocument = useCallback(async (collectionPath, docId, data) => {
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, collectionPath, docId);
            await updateDoc(docRef, data);
            return true;
        } catch (err) {
            console.error(`Error updating document ${collectionPath}/${docId}:`, err);
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Delete a document
    const removeDocument = useCallback(async (collectionPath, docId) => {
        setLoading(true);
        setError(null);
        try {
            const docRef = doc(db, collectionPath, docId);
            await deleteDoc(docRef);
            return true;
        } catch (err) {
            console.error(`Error deleting document ${collectionPath}/${docId}:`, err);
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
        addDocument,
        setDocument,
        updateDocument,
        removeDocument
    };
}
