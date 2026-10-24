import {
    addDaysToISTDateKey,
    formatISTDateKey,
    fromMinutes,
    IST_TIME_ZONE,
    istInstant,
    istNow,
} from "@/lib/ist";
import { format12h } from "@/lib/formatters";
import type { RideFares, RidePlace, RideSchedule } from "@/lib/types";

/** Short code the rider quotes in chat so the admin can find their application. */
export const riderRef = (uid: string) => uid.slice(0, 6).toUpperCase();

export const riderVerificationMessage = (rider: { name: string; uid: string }) =>
    `Hi! I've applied to be a rider on Pumato Rides.\n\nName: ${rider.name}\nRef: ${riderRef(rider.uid)}\n\nSharing my documents for verification.`;

/** Strips everything but digits, so "+91 90480 86503" works as a wa.me number. */
export const whatsappUrl = (number: string, text: string) =>
    `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/** Accepts the username with or without a leading "@". */
export const telegramUrl = (username: string, text: string) =>
    `https://t.me/${username.replace(/^@/, "")}?text=${encodeURIComponent(text)}`;

export const activePlaces = (places: RidePlace[]) => places.filter((p) => p.active);

/** Sorted, so A → B and B → A share one fare. */
export const routeKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

/** @returns the route's fare, or null if the admin hasn't priced it */
export const routeFare = (fares: RideFares, pickupId: string, dropId: string) =>
    fares[routeKey(pickupId, dropId)] ?? null;

export const formatFare = (fare: number) => `₹${fare}`;

export const DEFAULT_RIDE_SCHEDULE: RideSchedule = {
    reminderMinutes: 30,
    confirmMinutes: 15,
    minLeadMinutes: 30,
    maxDaysAhead: 3,
};

const SLOT_MINUTES = 15;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Whether a ride can be booked for `at`: past the minimum lead, within max days ahead. */
export const isSchedulable = (at: Date, now: Date, schedule: RideSchedule) => {
    const lead = at.getTime() - now.getTime();
    return lead >= schedule.minLeadMinutes * MINUTE_MS && lead <= schedule.maxDaysAhead * DAY_MS;
};

/** The schedulable 15-minute slots ("HH:MM") on IST day `dateKey`. */
export const bookableTimes = (dateKey: string, now: Date, schedule: RideSchedule) =>
    Array.from({ length: (24 * 60) / SLOT_MINUTES }, (_, i) =>
        fromMinutes(i * SLOT_MINUTES)
    ).filter((time) => isSchedulable(istInstant(dateKey, time), now, schedule));

/** IST days ("YYYY-MM-DD") with at least one schedulable slot. */
export const bookableDates = (now: Date, schedule: RideSchedule) => {
    const today = istNow(now);
    return Array.from({ length: schedule.maxDaysAhead + 1 }, (_, i) =>
        formatISTDateKey(addDaysToISTDateKey(today, i))
    ).filter((dateKey) => bookableTimes(dateKey, now, schedule).length > 0);
};

const rideDayFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
});

/** "Sun 25 Oct, 4:30 PM", in IST. */
export const formatRideTime = (at: Date) =>
    `${rideDayFormatter.format(at)}, ${format12h(fromMinutes(istNow(at).timeInMinutes))}`;
