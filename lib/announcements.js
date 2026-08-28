/**
 * The current "What's New" announcement shown via the bell icon in the Navbar.
 * Only one announcement is ever live at a time — replace this object in place
 * when you ship a new feature to announce. `date` must be DD-MM-YYYY.
 *
 * Set to `null` to hide the bell entirely.
 */
export const ANNOUNCEMENT = {
    id: "marketplace-launch",
    date: "15-08-2026",
    title: "Marketplace is live",
    body: "Buy and sell items with other students on campus.",
    href: "/marketplace",
};

/**
 * @param {string} dateStr - DD-MM-YYYY
 * @returns {number} epoch ms, safe for chronological comparison
 */
export function parseAnnouncementDate(dateStr) {
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
}
