import { z } from "zod";

/** A DEFAULT_CAMPUS_CONFIG id; mirrors isText(…, 40) in firestore.rules. */
const CampusIdSchema = z.string().min(1).max(40);

/** Mirrors the phone check in firestore.rules (ride_requests, riders). */
export const PHONE_PATTERN = /^[0-9]{10}$/;

export const RidePlaceSchema = z.object({
    // Stable id, so renaming a place doesn't orphan requests that reference it.
    id: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    active: z.boolean(),
    // A DEFAULT_CAMPUS_CONFIG id; absent for places on no campus, shown on every campus.
    campusId: CampusIdSchema.optional(),
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
    // Riders only see and hear about requests booked on their campus.
    campusId: CampusIdSchema,
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
 * pending → accepted → completed, where completing is the backend's job: it
 * marks an accepted ride completed the moment it's confirmed. Rides can also
 * be cancelled by their user (pending freely, accepted only until confirmed)
 * or, when scheduled and never taken, expire.
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

/** Campuses taking ride waitlist sign-ups instead of bookings. */
export const WAITLISTED_CAMPUSES = ["PTU", "PIMS"] as const;

/** `ride_waitlist/{uid}`: one campus per user, so the admin's headcount is real. */
export const RideWaitlistEntrySchema = z.object({
    userId: z.string().min(1),
    campusId: CampusIdSchema,
    createdAt: z.any(),
    updatedAt: z.any(),
});

/** Where the user is standing, from the browser's location; a ride now only. */
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
        // The booker's campus, even for a route between places on no campus.
        campusId: CampusIdSchema,
        riderPreference: z.enum(RIDER_PREFERENCES).default("any"),
        // Absent on requests booked before the option existed: one passenger.
        passengers: z.number().int().min(1).max(MAX_PASSENGERS).optional(),
        pickupLocation: PickupLocationSchema.optional(),
        createdAt: z.any(),
        // Every booking is signed in, so it can be followed up and cancelled.
        userId: z.string().min(1),
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
        // Snapshotted on accept, so the user can check who is coming without
        // being able to read the rider's whole application.
        riderPhoneMasked: z.string().max(20).optional(),
        riderRating: z.number().min(1).max(5).optional(),
        riderRatingCount: z.number().int().positive().optional(),
        acceptedAt: z.any().optional(),
        // The user's 1-minute window to cancel or confirm, then the function stamps it.
        userConfirmedAt: z.any().optional(),
        completedAt: z.any().optional(),
        // A ride now nobody took within 7 minutes is cancelled by the sweep.
        expiredAt: z.any().optional(),
        // Given once by the signed-in user who booked it; the function adds it to the
        // rider's total and stamps ratingCountedAt so a retry can't count it twice.
        rating: RideRatingSchema.optional(),
        ratingCountedAt: z.any().optional(),
    })
    .refine((r) => r.pickupId !== r.dropId, "Pickup and drop must differ")
    // Where they are when booking isn't where they'll be at a later time.
    .refine(
        (r) => r.scheduledFor === undefined || r.pickupLocation === undefined,
        "Only a ride now can share a pickup pin"
    );

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
    phone: z.string().regex(PHONE_PATTERN, "Enter a 10-digit phone number").optional(),
    // Epoch ms, as JSON keeps it.
    completedAt: z.number(),
});

export const CompletedRidesCacheSchema = z.object({
    // The latest server completedAt fetched; null before the first sync.
    syncedTo: z.number().nullable(),
    rides: z.array(CompletedRideSchema),
});
