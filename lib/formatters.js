/**
 * Converts a string to Title Case.
 * @param {string} str - The string to format
 * @returns {string} - The formatted string
 */
export const toTitleCase = (str) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

/**
 * Converts 24-hour time string "HH:MM" to 12-hour format "h:MM AM/PM"
 * @param {string} time24 - Time string in "HH:MM" format
 * @returns {string} - Formatted time string
 */
export const format12h = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

/**
 * Formats a raw counter value into a human-facing order number.
 * Zero-padded to 4 digits; rolls over to 5+ digits past 9999.
 * @param {number} n - The counter value (1-based)
 * @returns {string} - e.g. "ORD-0001"
 */
export const formatOrderNumber = (n) => `ORD-${String(n).padStart(4, "0")}`;

/**
 * Order number for display. Orders placed before the counter existed have no
 * `orderNumber`, so fall back to the short doc-id form those were shown as.
 * @param {Object} order - Order document (needs `orderNumber` and/or `id`)
 * @returns {string} - e.g. "ORD-0423", or "#A1B2C3" for legacy orders
 */
export const displayOrderNumber = (order) =>
    order?.orderNumber || (order?.id ? `#${order.id.slice(-6).toUpperCase()}` : "");
