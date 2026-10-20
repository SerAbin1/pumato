import { z } from "zod";

/** Mirrors the phone check in firestore.rules (ride_requests, riders). */
export const PHONE_PATTERN = /^[0-9]{10}$/;

export const RidePlaceSchema = z.object({
    // Stable id, so renaming a place doesn't orphan requests that reference it.
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    active: z.boolean(),
});

/** `site_content/rides_settings`: one doc, so the booking page costs one read. */
export const RidesSettingsSchema = z.object({
    whatsappNumber: z.string().trim(),
    telegramUsername: z.string().trim(),
    places: z.array(RidePlaceSchema),
});

export const RIDER_STATUSES = ["pending", "approved", "rejected", "revoked"] as const;

/**
 * `riders/{uid}`. The applicant writes it as `pending`; only the manageUsers
 * function moves it on, together with the `rider` claim.
 */
export const RiderSchema = z.object({
    uid: z.string(),
    email: z.string().nullable(),
    name: z.string().trim().min(1).max(80),
    phone: z.string().regex(PHONE_PATTERN, "Enter a 10-digit phone number"),
    vehicleNumber: z.string().trim().min(1).max(20),
    collegeId: z.string().trim().min(1).max(40),
    status: z.enum(RIDER_STATUSES),
    // Set by the approved rider from their dashboard; online riders get ride requests.
    online: z.boolean().optional(),
    createdAt: z.any(),
    updatedAt: z.any(),
});

export const RIDE_REQUEST_STATUSES = ["pending"] as const;

export const RideRequestSchema = z
    .object({
        name: z.string().trim().min(1).max(80),
        phone: z.string().regex(PHONE_PATTERN, "Enter a 10-digit phone number"),
        pickupId: z.string().min(1).max(64),
        pickupName: z.string().min(1).max(80),
        dropId: z.string().min(1).max(64),
        dropName: z.string().min(1).max(80),
        // Reserved for pricing; always null until fares exist.
        fare: z.null(),
        status: z.enum(RIDE_REQUEST_STATUSES),
        createdAt: z.any(),
    })
    .refine((r) => r.pickupId !== r.dropId, "Pickup and drop must differ");
