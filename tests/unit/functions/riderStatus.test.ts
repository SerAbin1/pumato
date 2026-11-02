import { describe, it, expect } from "vite-plus/test";
import { riderTransition } from "../../../functions/src/rider-status";

describe("riderTransition", () => {
    it("moves a pending rider towards approval", () => {
        expect(riderTransition("APPROVE_RIDER")).toEqual({ from: "pending", to: "approved" });
    });

    it("moves a pending rider to rejected", () => {
        expect(riderTransition("REJECT_RIDER")).toEqual({ from: "pending", to: "rejected" });
    });

    it("moves an approved rider to revoked", () => {
        expect(riderTransition("REVOKE_RIDER")).toEqual({ from: "approved", to: "revoked" });
    });

    it("moves a revoked rider back to approved, un-revoking them", () => {
        expect(riderTransition("UNREVOKE_RIDER")).toEqual({ from: "revoked", to: "approved" });
    });

    it("returns null for an unknown action", () => {
        expect(riderTransition("NOT_A_RIDER_ACTION")).toBeNull();
    });
});
