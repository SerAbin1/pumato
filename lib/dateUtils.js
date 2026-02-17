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

// For constructing next 7 days in laundry page slot selector
export const getISTDate = () => {
    // Returns a Date object that represents current time in IST
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istOffset = 5.5 * 60 * 60000; // IST is UTC + 5:30
    return new Date(utc + istOffset);
};

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

    // Construct a "local" date object that effectively mirrors IST time components
    // This is useful for Date-based logic that relies on local getters (getDate, getHours)
    // BE CAREFUL: This date object's UTC time is technically wrong, but its local methods return IST values
    // if we consider the browser renders it. 
    // ACTUALLY, simpler approach for consumers: just return the components.

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
    };
};
