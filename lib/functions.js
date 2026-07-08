import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

export const manageCoupons = httpsCallable(functions, "manageCoupons");
export const checkoutCoupon = httpsCallable(functions, "checkoutCoupon");
export const manageUsers = httpsCallable(functions, "manageUsers");
export const sendFcmNotification = httpsCallable(functions, "sendFcmNotification");
