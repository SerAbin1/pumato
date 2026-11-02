"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isPilotClaim, isApprovedPilot } from "@/lib/rides";
import { subscribeRider } from "@/lib/repositories";
import type { Rider } from "@/lib/types";

/**
 * Whether the signed-in user is an approved pilot, ready to take rides.
 * Undefined while their auth user or pilot status is still loading.
 */
export function useIsPilot(user: User | null | undefined): boolean | undefined {
    // undefined = still loading; null = hasn't applied
    const [rider, setRider] = useState<Rider | null | undefined>(undefined);
    // undefined = still checking the rider claim; false = no claim
    const [hasPilotClaim, setHasPilotClaim] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRider(undefined);
        setHasPilotClaim(undefined);
        if (!user) {
            setRider(null);
            setHasPilotClaim(false);
            return;
        }
        let stale = false;
        // Force-refresh so a freshly approved (or revoked) rider sees it.
        user.getIdTokenResult(true)
            .then((token) => !stale && setHasPilotClaim(isPilotClaim(token.claims)))
            .catch((error) => {
                console.error("Failed to check rider access:", error);
            });
        // Live, so a new approval or revocation shows without a reload.
        const unsubscribe = subscribeRider(user.uid, setRider, (error) => {
            console.error("Failed to load rider:", error);
        });
        return () => {
            stale = true;
            unsubscribe();
        };
    }, [user]);

    if (!user) return false;
    if (rider === undefined || hasPilotClaim === undefined) return undefined;
    // Approved pilots carry the `rider` claim and an approved rider doc.
    return isApprovedPilot(rider, hasPilotClaim);
}
