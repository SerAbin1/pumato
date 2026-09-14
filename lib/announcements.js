/**
 * The current "What's New" announcement shown via the bell icon in the Navbar.
 * Only one announcement is ever live at a time — replace this object in place
 * when you ship a new feature to announce. `date` must be DD-MM-YYYY.
 *
 * Set to `null` to hide the bell entirely.
 */
export const ANNOUNCEMENT = {
    id: "user-feats",
    date: "14-09-2026",
    title: "Users can add favourites, view past orders & more",
    body: "Add your loved items to favourites for easy access or view your past orders, view pre-order slots in the live button dropdown. Click on your profile icon to access these new features. Only for logged in users.",
    href: "/favourites",
};

/**
 * @param {string} dateStr - DD-MM-YYYY
 * @returns {number} epoch ms, safe for chronological comparison
 */
export function parseAnnouncementDate(dateStr) {
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
}
