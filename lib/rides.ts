import type { RidePlace } from "@/lib/types";

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
