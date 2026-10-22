/**
 * Formats a "YYYY-MM-DD" date key into a short display string, e.g. "Aug 29".
 * @param {string} dateKey
 * @returns {string}
 */
export const formatDateKeyShort = (dateKey: string | null | undefined): string => {
    if (!dateKey) return "";
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** A Firestore Timestamp, or anything `new Date()` accepts. */
export type DateLike = { toDate: () => Date } | Date | string | number;

export const formatTime = (date: DateLike | null | undefined): string => {
    if (!date) return "";
    // If it's a Firestore timestamp, convert to JS Date
    const d = typeof date === "object" && "toDate" in date ? date.toDate() : new Date(date as Date);

    return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};
