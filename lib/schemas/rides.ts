import { z } from "zod";

/** Mirrors the phone check in firestore.rules (ride_requests, riders). */
export const PHONE_PATTERN = /^[0-9]{10}$/;

export const RidePlaceSchema = z.object({
    // Stable id, so renaming a place doesn't orphan requests that reference it.
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    active: z.boolean(),
    // A DEFAULT_CAMPUS_CONFIG id; absent for places on no campus, shown on every campus.
    campusId: z.string().min(1).optional(),
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
    schedule: RideScheduleSchema,
});

export const RIDER_STATUSES = ["pending", "approved", "rejected", "revoked"] as const;

/** Only "female" changes anything: those riders also get female-preference requests. */
export const RIDER_GENDERS = ["female", "male", "other"] as const;

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
    // Asked on every application; riders approved before it existed have none.
    gender: z.enum(RIDER_GENDERS).optional(),
    status: z.enum(RIDER_STATUSES),
    // Set by the approved rider from their dashboard; online riders get ride requests.
    online: z.boolean().optional(),
    // Kept by the onRideRequestUpdated function as users rate this rider's rides.
    ratingSum: z.number().int().optional(),
    ratingCount: z.number().int().optional(),
    createdAt: z.any(),
    updatedAt: z.any(),
});

/**
 * pending → accepted → completed; the rider can release an accepted ride back
 * to pending. A scheduled ride can also be cancelled by its user, or expire
 * when nobody took it.
 */
export const RIDE_REQUEST_STATUSES = [
    "pending",
    "accepted",
    "completed",
    "cancelled",
    "expired",
] as const;

/** Most passengers one request can book; matches firestore.rules. */
export const MAX_PASSENGERS = 2;

/** Where the guest is standing, from the browser's location; a ride now only. */
export const PickupLocationSchema = z
    .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        // Metres, as the browser reports it, so the rider knows how far to trust the pin.
        accuracy: z.number().positive(),
    })
    .strict();

/** Stars a user gives the rider of a completed ride; matches firestore.rules. */
export const MAX_RATING = 5;
export const RideRatingSchema = z.number().int().min(1).max(MAX_RATING);

/** "female" sends the request to female riders only. */
export const RIDER_PREFERENCES = ["any", "female"] as const;

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
        riderPreference: z.enum(RIDER_PREFERENCES).default("any"),
        // Absent on requests booked before the option existed: one passenger.
        passengers: z.number().int().min(1).max(MAX_PASSENGERS).optional(),
        pickupLocation: PickupLocationSchema.optional(),
        createdAt: z.any(),
        // Scheduled rides only: booking needs a signed-in user, so they can follow it up.
        userId: z.string().optional(),
        scheduledFor: z.any().optional(),
        // Set by the sweep: when riders were pushed again near the ride's time,
        // and when the accepted rider was asked to confirm.
        broadcastAt: z.any().optional(),
        confirmRequestedAt: z.any().optional(),
        riderConfirmedAt: z.any().optional(),
        cancelledAt: z.any().optional(),
        // Set when a rider accepts; cleared if they release the ride.
        riderUid: z.string().optional(),
        riderName: z.string().optional(),
        acceptedAt: z.any().optional(),
        completedAt: z.any().optional(),
        // Given once by the signed-in user who booked it; the function adds it to the
        // rider's total and stamps ratingCountedAt so a retry can't count it twice.
        rating: RideRatingSchema.optional(),
        ratingCountedAt: z.any().optional(),
    })
    .refine((r) => r.pickupId !== r.dropId, "Pickup and drop must differ")
    .refine((r) => r.scheduledFor === undefined || !!r.userId, "Sign in to schedule a ride")
    // Where they are when booking isn't where they'll be at a later time.
    .refine(
        (r) => r.scheduledFor === undefined || r.pickupLocation === undefined,
        "Only a ride now can share a pickup pin"
    );

/**
 * A signed-out guest's ride, kept in their browser so they can cancel it. Guests
 * can only ride now, and can't read the request back, so this is as booked.
 */
export const GuestRideSchema = z.object({
    id: z.string().min(1),
    pickupName: z.string(),
    dropName: z.string(),
    fare: FareSchema.nullable(),
    passengers: z.number().int().min(1),
    // Epoch ms, as JSON keeps it.
    createdAt: z.number(),
});

/**
 * A ride the rider completed, as their browser keeps it for history and
 * earnings. A completed ride never changes, so the copy never goes stale.
 */
export const CompletedRideSchema = z.object({
    id: z.string().min(1),
    pickupName: z.string(),
    dropName: z.string(),
    fare: FareSchema.nullable(),
    passengers: z.number().int().min(1),
    guestName: z.string(),
    // Epoch ms, as JSON keeps it.
    completedAt: z.number(),
});

export const CompletedRidesCacheSchema = z.object({
    // The latest server completedAt fetched; null before the first sync.
    syncedTo: z.number().nullable(),
    rides: z.array(CompletedRideSchema),
});
