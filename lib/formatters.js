/**
 * Converts a string to Title Case.
 * @param {string} str - The string to format
 * @returns {string} - The formatted string
 */
export const toTitleCase = (str) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Converts 24-hour time string "HH:MM" to 12-hour format "h:MM AM/PM"
 * @param {string} time24 - Time string in "HH:MM" format
 * @returns {string} - Formatted time string
 */
export const format12h = (time24) => {
    if (!time24) return "";
    const [hours, minutes] = time24.split(":");
    let h = parseInt(hours, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${minutes} ${ampm}`;
};
