const { initializeApp } = require("firebase-admin/app");

initializeApp();

const { manageCoupons } = require("./manage-coupons");
const { checkoutCoupon } = require("./checkout-coupon");
const { manageUsers } = require("./manage-users");
const { sendFcmNotification } = require("./send-fcm-notification");

exports.manageCoupons = manageCoupons;
exports.checkoutCoupon = checkoutCoupon;
exports.manageUsers = manageUsers;
exports.sendFcmNotification = sendFcmNotification;
