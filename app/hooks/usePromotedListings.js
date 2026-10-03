"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { selectPromotions } from "@/lib/marketplacePromotions";
import { useCart } from "@/app/context/CartContext";

const VISITOR_ID_KEY = "pumato_visitor_id";

// Shared across every surface on the page so the popup and in-feed cards cost one read
let promotedListingsPromise = null;

function fetchPromotedListings() {
    if (!promotedListingsPromise) {
        const q = query(
            collection(db, COLLECTIONS.MARKETPLACE_LISTINGS),
            where("promotion.tier", "in", ["L2", "L3"])
        );
        promotedListingsPromise = getDocs(q)
            .then((snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() })))
            .catch((err) => {
                console.error("Error fetching promoted listings:", err);
                promotedListingsPromise = null;
                return [];
            });
    }
    return promotedListingsPromise;
}

function getVisitorId() {
    try {
        let id = localStorage.getItem(VISITOR_ID_KEY);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(VISITOR_ID_KEY, id);
        }
        return id;
    } catch {
        return null;
    }
}

/**
 * Promoted marketplace listings this visitor should see in one placement.
 * @param {"inFeed"|"popup"} placement
 * @param {string} [surface] - required for inFeed, see PROMOTION_SURFACES
 */
export default function usePromotedListings(placement, surface) {
    const { userDetails, isLoaded } = useCart();
    const [listings, setListings] = useState([]);
    const [visitorId, setVisitorId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        fetchPromotedListings().then((data) => {
            if (cancelled) return;
            setListings(data);
            setVisitorId(getVisitorId());
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const campus = userDetails?.campus;
    return useMemo(() => {
        if (!isLoaded || !visitorId) return [];
        return selectPromotions(listings, { placement, surface, campus, visitorId });
    }, [listings, placement, surface, campus, visitorId, isLoaded]);
}
