/**
 * The one place that knows about IST and "HH:MM" time windows. Everything that
 * reads the clock in IST, or compares a time of day against admin-configured
 * hours, goes through here.
 */

export const IST_TIME_ZONE = "Asia/Kolkata";

/** A {year, month(0-idx), day} calendar triple. */
export interface DateParts {
    year: number;
    month: number;
    day: number;
}

/** The IST calendar day and wall-clock time at some instant. */
export interface ISTNow extends DateParts {
    hours: number;
    minutes: number;
    /** Minutes since IST midnight. */
    timeInMinutes: number;
}

// hourCycle "h23" rather than hour12:false — the latter renders midnight as "24" on some engines.
const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
});

/** Reads the IST calendar day and wall-clock time at `at` (defaults to now). */
export function istNow(at: Date = new Date()): ISTNow {
    const parts = istFormatter.formatToParts(at);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value);

    const hours = part("hour");
    const minutes = part("minute");
    return {
        year: part("year"),
        month: part("month") - 1,
        day: part("day"),
        hours,
        minutes,
        timeInMinutes: hours * 60 + minutes,
    };
}

// IST has no daylight saving: always UTC+05:30.
const IST_OFFSET_MIN = 5 * 60 + 30;

/** The instant at IST wall-clock `hhmm` on IST day `dateKey` ("YYYY-MM-DD"). */
export const istInstant = (dateKey: string, hhmm: string): Date => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, toMinutes(hhmm) - IST_OFFSET_MIN));
};

/** "HH:MM" → minutes since midnight. A missing time is read as `fallback`. */
export const toMinutes = (hhmm: string | undefined, fallback = "00:00") => {
    const [h, m] = (hhmm || fallback).split(":").map(Number);
    return h * 60 + m;
};

/** Minutes since midnight → zero-padded "HH:MM". */
export const fromMinutes = (min: number) =>
    `${Math.floor(min / 60)
        .toString()
        .padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`;

/**
 * Whether `nowInMinutes` falls inside the start–end window, both edges included.
 * A window whose end is before its start runs past midnight. A missing start
 * means 00:00 and a missing end means 23:59.
 */
export function isWithinWindow(
    nowInMinutes: number,
    start: string | undefined,
    end: string | undefined
): boolean {
    const startMin = toMinutes(start);
    const endMin = toMinutes(end, "23:59");
    return startMin <= endMin
        ? nowInMinutes >= startMin && nowInMinutes <= endMin
        : nowInMinutes >= startMin || nowInMinutes <= endMin;
}

/** Formats a {year, month(0-idx), day} triple into a "YYYY-MM-DD" key. */
export const formatISTDateKey = ({ year, month, day }: DateParts): string => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

/** Adds `dayOffset` days to a {year, month(0-idx), day} triple, normalizing month/year rollover. */
export const addDaysToISTDateKey = (
    { year, month, day }: DateParts,
    dayOffset: number
): DateParts => {
    const d = new Date(year, month, day + dayOffset);
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
};
