/**
 * Pumato Rides decisions for the backend: which rider status an admin action
 * moves a rider from and to. Pure, with no Firebase imports.
 */

export const RIDER_STATUSES = ["pending", "approved", "rejected", "revoked"] as const;

export type RiderStatus = (typeof RIDER_STATUSES)[number];

/** Which rider status each admin action moves from and to. */
export const RIDER_TRANSITIONS = {
    APPROVE_RIDER: { from: "pending", to: "approved" },
    REJECT_RIDER: { from: "pending", to: "rejected" },
    REVOKE_RIDER: { from: "approved", to: "revoked" },
    UNREVOKE_RIDER: { from: "revoked", to: "approved" },
} as const;

export type RiderAction = keyof typeof RIDER_TRANSITIONS;

/** The rider status change an admin action performs, or null when the action is unknown. */
export function riderTransition(action: string): (typeof RIDER_TRANSITIONS)[RiderAction] | null {
    const transition = RIDER_TRANSITIONS[action as RiderAction];
    return transition ?? null;
}
