/**
 * The current "What's New" announcement shown via the bell icon in the Navbar.
 * Only one announcement is ever live at a time — replace this object in place
 * when you ship a new feature to announce. `date` must be DD-MM-YYYY.
 *
 * Set to `null` to hide the bell entirely.
 */
export interface Announcement {
    id: string;
    date: string;
    title: string;
    body: string;
    href?: string;
}

export const ANNOUNCEMENT: Announcement | null = {
    id: "trending",
    date: "04-10-2026",
    title: "Trending items are here",
    body: "See what everyone on campus is ordering. Check out the new Trending row on the delivery page, refreshed weekly.",
    href: "/delivery",
};

/**
 * @param dateStr - DD-MM-YYYY
 * @returns epoch ms, safe for chronological comparison
 */
export function parseAnnouncementDate(dateStr: string): number {
    const [day, month, year] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
}
