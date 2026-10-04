import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import type { UserRecord } from "firebase-admin/auth";

const auth = getAuth();

interface ManageUsersRequest {
    action?: string;
    email?: string;
    password?: string;
    restaurantId?: string;
    uid?: string;
}

interface ManagedUser {
    uid: string;
    email?: string;
    restaurantId?: string;
    lastSignInTime?: string;
}

async function verifyAdmin(token: string) {
    try {
        const decoded = await auth.verifyIdToken(token);
        return decoded.admin === true;
    } catch {
        return false;
    }
}

export const manageUsers = onCall<ManageUsersRequest>(async (request) => {
    const authHeader = request.rawRequest.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw new HttpsError("unauthenticated", "Missing authorization header.");
    }

    const token = authHeader.split(" ")[1];
    const isAdmin = await verifyAdmin(token);
    if (!isAdmin) {
        throw new HttpsError("permission-denied", "Admin access required.");
    }

    const { action, email, password, restaurantId, uid } = request.data;

    if (action === "CREATE_PARTNER") {
        if (!email || !password) {
            throw new HttpsError("invalid-argument", "Email and password required.");
        }

        let userRecord: UserRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
        } catch {
            userRecord = await auth.createUser({ email, password, emailVerified: true });
        }

        await auth.setCustomUserClaims(userRecord.uid, { partner: true, restaurantId });
        return { success: true, uid: userRecord.uid };
    }

    if (action === "CREATE_DELIVERY_PARTNER") {
        if (!email || !password) {
            throw new HttpsError("invalid-argument", "Email and password required.");
        }

        let userRecord: UserRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
        } catch {
            userRecord = await auth.createUser({ email, password, emailVerified: true });
        }

        await auth.setCustomUserClaims(userRecord.uid, { deliveryPartner: true });
        return { success: true, uid: userRecord.uid };
    }

    if (action === "DELETE_USER") {
        if (!uid) {
            throw new HttpsError("invalid-argument", "Missing uid for deletion.");
        }
        await auth.deleteUser(uid);
        return { success: true };
    }

    if (action === "LIST_USERS") {
        const listResult = await auth.listUsers(1000);
        const partners: ManagedUser[] = [];
        const deliveryPartners: ManagedUser[] = [];

        for (const user of listResult.users) {
            const claims = user.customClaims || {};

            if (claims.partner === true) {
                partners.push({
                    uid: user.uid,
                    email: user.email,
                    restaurantId: claims.restaurantId,
                    lastSignInTime: user.metadata.lastSignInTime,
                });
            }

            if (claims.deliveryPartner === true) {
                deliveryPartners.push({
                    uid: user.uid,
                    email: user.email,
                    lastSignInTime: user.metadata.lastSignInTime,
                });
            }
        }

        return { partners, deliveryPartners };
    }

    throw new HttpsError("invalid-argument", `Unknown action: ${action}`);
});
