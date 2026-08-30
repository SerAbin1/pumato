"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { fetchFavourites, saveFavourites } from "@/lib/repositories";
import { toggleFavourite, isFavourite as isFavouriteIn } from "@/lib/favourites";

/**
 * A signed-in user's favourited menu items.
 *
 * Toggling updates local state first and writes in the background: a heart
 * that waits on a round trip feels broken. A failed write rolls the list back
 * so the UI never claims something was saved when it wasn't.
 *
 * @param {Object|null} user - Firebase auth user, or null when signed out
 */
export function useFavourites(user) {
    const [favourites, setFavourites] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;

        if (!user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFavourites([]);
            setLoaded(true);
            return;
        }

        setLoaded(false);
        fetchFavourites(user.uid)
            .then((stored) => {
                if (!cancelled) setFavourites(stored);
            })
            .catch((error) => console.error("Failed to load favourites:", error))
            .finally(() => {
                if (!cancelled) setLoaded(true);
            });

        return () => {
            cancelled = true;
        };
    }, [user]);

    const toggle = useCallback(
        async (fav) => {
            if (!user) {
                toast.error("Sign in to save favourites");
                return;
            }

            const previous = favourites;
            const next = toggleFavourite(favourites, fav);
            if (next === previous) return;

            setFavourites(next);

            try {
                await saveFavourites(user.uid, next);
            } catch (error) {
                console.error("Failed to save favourites:", error);
                setFavourites(previous);
                toast.error("Couldn't save that. Try again.");
            }
        },
        [user, favourites]
    );

    const isFavourite = useCallback((fav) => isFavouriteIn(favourites, fav), [favourites]);

    return useMemo(
        () => ({ favourites, loaded, toggle, isFavourite, signedIn: Boolean(user) }),
        [favourites, loaded, toggle, isFavourite, user]
    );
}
