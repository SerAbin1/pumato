import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

const functions = getFunctions(app);

export const manageCoupons = httpsCallable(functions, "manageCoupons");
export const checkoutCoupon = httpsCallable(functions, "checkoutCoupon");
export const manageUsers = httpsCallable(functions, "manageUsers");
export const sendFcmNotification = httpsCallable(functions, "sendFcmNotification");
