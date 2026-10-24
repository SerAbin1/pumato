import { z } from "zod";

/** Mirrors the phone check in firestore.rules (ride_requests, riders). */
export const PHONE_PATTERN = /^[0-9]{10}$/;

export const RidePlaceSchema = z.object({
    // Stable id, so renaming a place doesn't orphan requests that reference it.
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    active: z.boolean(),
});

/** Whole rupees. */
export const FareSchema = z.number().int().positive();

/** Keyed by routeKey(a, b), so one fare covers both directions of a route. */
export const RideFaresSchema = z.record(z.string(), FareSchema);

/** Admin-tunable timings for scheduled rides. */
export const RideScheduleSchema = z
    .object({
        // How long before the ride the accepted rider is asked to confirm.
        reminderMinutes: z.number().int().min(5).max(180),
        // How long they have to confirm before the ride goes back to everyone.
        confirmMinutes: z.number().int().min(1).max(120),
        // Earliest a ride can be booked for, from now.
        minLeadMinutes: z
            .number()
            .int()
            .min(0)
            .max(24 * 60),
        maxDaysAhead: z.number().int().min(1).max(30),
    })
    .refine(
        (s) => s.confirmMinutes < s.reminderMinutes,
        "The confirm window must end before the ride starts"
    );

/** `site_content/rides_settings`: one doc, so the booking page costs one read. */
export const RidesSettingsSchema = z.object({
    whatsappNumber: z.string().trim(),
    telegramUsername: z.string().trim(),
    places: z.array(RidePlaceSchema),
    fares: RideFaresSchema,
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

/** pending → accepted → completed; the rider can release an accepted ride back to pending. */
export const RIDE_REQUEST_STATUSES = ["pending", "accepted", "completed"] as const;

export const RideRequestSchema = z
    .object({
        name: z.string().trim().min(1).max(80),
        phone: z.string().regex(PHONE_PATTERN, "Enter a 10-digit phone number"),
        pickupId: z.string().min(1).max(64),
        pickupName: z.string().min(1).max(80),
        dropId: z.string().min(1).max(64),
        dropName: z.string().min(1).max(80),
        // Null when the admin hasn't priced the route; the rider quotes it on the call.
        fare: FareSchema.nullable(),
        status: z.enum(RIDE_REQUEST_STATUSES),
        createdAt: z.any(),
        // Set when a rider accepts; cleared if they release the ride.
        riderUid: z.string().optional(),
        riderName: z.string().optional(),
        acceptedAt: z.any().optional(),
        completedAt: z.any().optional(),
    })
    .refine((r) => r.pickupId !== r.dropId, "Pickup and drop must differ");
