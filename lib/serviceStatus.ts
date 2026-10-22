import { isWithinWindow } from "@/lib/ist";

export type OverrideStatus = "open" | "closed" | null | undefined;

export interface ServiceSlot {
    start?: string;
    end?: string;
}

/**
 * Determines whether the service is live.
 *
 * @param nowInMinutes Minutes since midnight.
 */
export function isServiceLive(
    manualOverrideStatus: OverrideStatus,
    scheduledSlots: ServiceSlot[] | null | undefined,
    nowInMinutes: number
): boolean {
    if (manualOverrideStatus === "open") {
        return true;
    }

    if (manualOverrideStatus === "closed") {
        return false;
    }

    if (!scheduledSlots || scheduledSlots.length === 0) {
        return false;
    }

    return scheduledSlots.some((slot) => isWithinWindow(nowInMinutes, slot.start, slot.end));
}

/**
 * Whether checkout should be open — the same as isServiceLive, except a pre-order path
 * (campus-wide, or via any pre-order-enabled restaurant in the cart) always allows checkout
 * regardless of scheduled ordering hours or a manual override. Pre-order exists precisely so
 * customers can order ahead while the store is otherwise closed — "Ordering Hours" and manual
 * open/closed overrides govern immediate ordering only.
 *
 * @param nowInMinutes Minutes since midnight.
 */
export function isCheckoutOpen(
    hasPreOrderPath: boolean,
    manualOverrideStatus: OverrideStatus,
    scheduledSlots: ServiceSlot[] | null | undefined,
    nowInMinutes: number
): boolean {
    if (hasPreOrderPath) return true;
    return isServiceLive(manualOverrideStatus, scheduledSlots, nowInMinutes);
}
