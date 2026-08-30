/**
 * UPI deep links and transaction-reference handling.
 *
 * Paying over UPI is an *app switch*, not a page navigation: we hand the user
 * off to GPay/PhonePe/Paytm and the UPI intent spec has no way to redirect
 * back. Nothing here should try to build one — the return is always manual,
 * and confirmation comes from the reference the user pastes back.
 */

/** A VPA looks like `name@bank`. Deliberately loose — banks keep adding handles. */
const VPA_PATTERN = /^[\w.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * NPCI reference numbers are 12 digits, but the apps disagree about what they
 * surface: GPay shows a 12-digit UPI transaction ID, PhonePe a longer
 * alphanumeric one. Accept a broad alphanumeric range rather than rejecting a
 * reference the user is reading off their own screen.
 */
const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9]{8,35}$/;

export const isValidVpa = (vpa) => VPA_PATTERN.test(String(vpa || "").trim());

/** @returns {string} the reference normalised for storage, or "" if unusable */
export const normalizeTransactionId = (value) =>
    String(value || "")
        .trim()
        .toUpperCase();

export const isValidTransactionId = (value) =>
    TRANSACTION_ID_PATTERN.test(normalizeTransactionId(value));

/**
 * The merchant reference we put in the deep link, so a payment can be matched
 * to an order by eye in the bank statement. UPI `tr` is alphanumeric only, so
 * the order number's dash is stripped: ORD-0423 -> ORD0423.
 *
 * @param {string} orderNumber
 * @returns {string}
 */
export const paymentReference = (orderNumber) =>
    String(orderNumber || "").replace(/[^A-Za-z0-9]/g, "");

/**
 * Builds a `upi://pay` deep link.
 *
 * @param {Object} params
 * @param {string} params.vpa - Payee UPI ID, from admin Global Settings
 * @param {string} params.payeeName - Shown in the UPI app's confirm screen
 * @param {number} params.amount - Rupees
 * @param {string} [params.orderNumber] - Becomes the merchant reference
 * @param {string} [params.note] - Transaction note
 * @returns {string|null} the deep link, or null when it couldn't be built safely
 */
export function buildUpiLink({ vpa, payeeName, amount, orderNumber, note } = {}) {
    if (!isValidVpa(vpa)) return null;

    const value = Number(amount);
    // A zero or negative amount would open the UPI app asking the user to type
    // their own figure, which is worse than showing no Pay button at all.
    if (!Number.isFinite(value) || value <= 0) return null;

    const params = new URLSearchParams({
        pa: String(vpa).trim(),
        pn: payeeName || "Pumato",
        am: value.toFixed(2),
        cu: "INR",
    });

    const reference = paymentReference(orderNumber);
    if (reference) params.set("tr", reference);
    params.set("tn", note || (reference ? `Pumato order ${reference}` : "Pumato order"));

    return `upi://pay?${params.toString()}`;
}
