import admin from "firebase-admin";
import path from "path";
import fs from "fs";
import { loadTestEnv } from "./env.js";

let _app = null;
let _db = null;

function getEnv() {
    return loadTestEnv();
}

export function initFirebaseAdmin() {
    if (_app) return _db;

    const env = getEnv();

    // Safety guard: refuse to run against production
    if (env.TEST_FIREBASE_PROJECT_ID === env.PRODUCTION_FIREBASE_PROJECT_ID) {
        throw new Error(
            `FATAL: Tests are pointing to production Firebase project "${env.TEST_FIREBASE_PROJECT_ID}". Aborting.`
        );
    }

    const serviceAccountPath = path.resolve(
        process.cwd(),
        env.TEST_FIREBASE_SERVICE_ACCOUNT_PATH
    );

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

    _app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: env.TEST_FIREBASE_PROJECT_ID,
    });

    _db = admin.firestore(_app);
    return _db;
}

export function getDb() {
    if (!_db) initFirebaseAdmin();
    return _db;
}

/**
 * Create a test restaurant with a known ID and menu items.
 */
export async function createTestRestaurant(restaurantId, data) {
    const db = getDb();
    await db.collection("restaurants").doc(restaurantId).set(data);
    return restaurantId;
}

/**
 * Create a test order with a known ID.
 */
export async function createTestOrder(orderId, data) {
    const db = getDb();
    await db.collection("orders").doc(orderId).set({
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return orderId;
}

/**
 * Update order status (e.g., admin confirm).
 */
export async function updateOrderStatus(orderId, status, extraFields = {}) {
    const db = getDb();
    await db
        .collection("orders")
        .doc(orderId)
        .update({
            status,
            adminProcessedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...extraFields,
        });
}

/**
 * Get restaurant document data.
 */
export async function getRestaurantDoc(restaurantId) {
    const db = getDb();
    const snap = await db.collection("restaurants").doc(restaurantId).get();
    return snap.exists ? snap.data() : null;
}

/**
 * Get order document data.
 */
export async function getOrderDoc(orderId) {
    const db = getDb();
    const snap = await db.collection("orders").doc(orderId).get();
    return snap.exists ? snap.data() : null;
}

/**
 * Delete test documents (cleanup).
 */
export async function cleanupTestData({ restaurantId, orderId } = {}) {
    const db = getDb();
    const batch = db.batch();

    if (restaurantId) {
        batch.delete(db.collection("restaurants").doc(restaurantId));
    }
    if (orderId) {
        batch.delete(db.collection("orders").doc(orderId));
    }

    await batch.commit();
}

/**
 * Shutdown Firebase Admin.
 */
export async function shutdownFirebaseAdmin() {
    if (_app) {
        await _app.delete();
        _app = null;
        _db = null;
    }
}
