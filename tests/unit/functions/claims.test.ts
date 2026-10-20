import { describe, it, expect } from "vite-plus/test";
import { grantRole, revokeRole } from "../../../functions/src/claims";

describe("grantRole", () => {
    it("keeps the roles a user already has", () => {
        expect(grantRole({ admin: true }, { role: "deliveryPartner" })).toEqual({
            admin: true,
            deliveryPartner: true,
        });
    });

    it("moves a partner to a new restaurant, keeping their other roles", () => {
        const existing = { partner: true, restaurantId: "r1", rider: true };
        expect(grantRole(existing, { role: "partner", restaurantId: "r2" })).toEqual({
            partner: true,
            restaurantId: "r2",
            rider: true,
        });
    });

    it("grants a role to a user with no claims yet", () => {
        expect(grantRole(undefined, { role: "rider" })).toEqual({ rider: true });
    });
});

describe("revokeRole", () => {
    it("removes only the revoked role", () => {
        expect(revokeRole({ admin: true, rider: true }, "rider")).toEqual({ admin: true });
    });

    // Firestore rules grant partner access on `restaurantId` alone.
    it("removes a partner's restaurant along with the partner role", () => {
        const existing = { partner: true, restaurantId: "r1", rider: true };
        expect(revokeRole(existing, "partner")).toEqual({ rider: true });
    });
});
