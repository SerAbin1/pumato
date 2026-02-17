/**
 * Returns current time in IST components (hours, minutes, total minutes).
 * @returns {{hours: number, minutes: number, timeInMinutes: number}}
 */
export const getISTTime = () => {
    const now = new Date();
    // specific formatting to extract HH and MM in IST (Asia/Kolkata)
    const timeString = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
    });

    // Handle cases where timeString might include "24" or other variations, 
    // though "en-US" with hour12:false usually gives "HH:MM"
    const [hours, minutes] = timeString.split(":").map(Number);
    return { hours, minutes, timeInMinutes: hours * 60 + minutes };
};

/**
 * Returns a Date object representing the current time shifted to IST.
 * Note: The UTC methods of this object will return IST values.
 * @returns {Date}
 */
export const getISTDate = () => {
    // Returns a Date object that represents current time in IST
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60000; // IST is UTC + 5:30
    return new Date(utc + istOffset);
};

/**
 * Returns detailed date components in IST, including a "local" Date object.
 * @returns {{dateObj: Date, dayName: string, day: number, month: number, year: number, hours: number, minutes: number, timeInMinutes: number}}
 */
export const getISTObject = () => {
    const now = new Date();
    const options = {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        weekday: "long"
    };

    // Use Intl.DateTimeFormat for reliable parts extraction
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(now);

    const part = (type) => parts.find(p => p.type === type)?.value;

    const year = parseInt(part("year"));
    const month = parseInt(part("month")) - 1; // 0-indexed
    const day = parseInt(part("day"));
    const hour = parseInt(part("hour"));
    const minute = parseInt(part("minute"));

    const dayName = part("weekday");

    return {
        dateObj: new Date(year, month, day, hour, minute), // Local representation of IST
        dayName,
        day: day,
        month: month,
        year: year,
        hours: hour,
        minutes: minute,
        timeInMinutes: hour * 60 + minute
    }
}

/**
 * Checks if a manual override is active for the current IST day.
 * @param {Object} settings - The settings object containing manualOverride field
 * @returns {string|null} - 'open', 'closed', or null (if auto/expired)
 */
export const checkManualOverride = (settings) => {
    if (!settings || !settings.manualOverride) return null;

    const { status, validForDate } = settings.manualOverride;
    if (!status || status === 'auto') return null;

    // Get current date in IST YYYY-MM-DD
    const { year, month, day } = getISTObject();
    const currentISTDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (validForDate === currentISTDate) {
        return status;
    }

    return null; // Override is mostly likely from a past date, so ignore it
};
