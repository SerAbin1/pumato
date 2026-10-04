import { getFunctions, httpsCallable } from "firebase/functions";
import type { HttpsCallableResult } from "firebase/functions";
import { app } from "@/lib/firebase";

const functions = getFunctions(app);

/**
 * Every callable takes `{ action?, payload? }`-style data and returns whatever
 * that action produces; call sites narrow the result with a type argument,
 * e.g. `manageCoupons<Coupon[]>({ action: "FETCH_VISIBLE" })`.
 */
const callable = (name: string) => {
    const fn = httpsCallable(functions, name);
    return <Res = any>(data?: unknown) => fn(data) as Promise<HttpsCallableResult<Res>>;
};

export const manageCoupons = callable("manageCoupons");
export const checkoutCoupon = callable("checkoutCoupon");
export const manageUsers = callable("manageUsers");
export const sendFcmNotification = callable("sendFcmNotification");
export const refreshTrending = callable("refreshTrending");
