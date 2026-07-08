import { initializeApp } from "firebase-admin/app";

initializeApp();

export { manageCoupons } from "./manage-coupons.js";
export { checkoutCoupon } from "./checkout-coupon.js";
export { manageUsers } from "./manage-users.js";
export { sendFcmNotification } from "./send-fcm-notification.js";
