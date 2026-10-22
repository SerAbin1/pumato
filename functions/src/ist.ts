/**
 * IST day boundaries for the backend. The functions package can't import the
 * web app's lib/ist.ts, so this is its counterpart.
 */

export const IST_TIME_ZONE = "Asia/Kolkata";

// IST has no daylight saving: always UTC+05:30, so a fixed offset is exact.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** The IST midnight that began the IST day containing `now`. */
export const startOfIstDay = (now: Date): Date => {
    const istDayStart = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS;
    return new Date(istDayStart - IST_OFFSET_MS);
};

/** The next midnight in IST after `now`. */
export const nextIstMidnight = (now: Date): Date => new Date(startOfIstDay(now).getTime() + DAY_MS);

/** The IST day of the week at `now`, Sunday = 0. */
export const istWeekday = (now: Date): number =>
    new Date(now.getTime() + IST_OFFSET_MS).getUTCDay();
