/**
 * Custom-claim roles. A user can hold several at once (e.g. an admin who also
 * rides), so every write must merge into the existing claims, never replace them.
 */
export type Claims = Record<string, unknown>;

export type RoleGrant =
    | { role: "admin" }
    | { role: "deliveryPartner" }
    | { role: "rider" }
    | { role: "partner"; restaurantId: string };

/** @returns `existing` with `grant` added; other roles untouched */
export function grantRole(existing: Claims | undefined, grant: RoleGrant): Claims {
    const claims: Claims = { ...existing, [grant.role]: true };
    if (grant.role === "partner") claims.restaurantId = grant.restaurantId;
    return claims;
}

/** @returns `existing` without `role`; other roles untouched */
export function revokeRole(existing: Claims | undefined, role: RoleGrant["role"]): Claims {
    const { [role]: _revoked, ...rest } = existing ?? {};
    // Firestore rules grant partner access on `restaurantId` alone.
    if (role === "partner") delete rest.restaurantId;
    return rest;
}
