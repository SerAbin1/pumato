"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { fetchFavourites, saveFavourites } from "@/lib/repositories";
import { toggleFavourite, favouriteKey } from "@/lib/favourites";
import type { Favourite } from "@/lib/favourites";
import { useUserAuth } from "./UserAuthContext";

type FavouriteRef = Partial<Favourite> & Pick<Favourite, "restaurantId" | "itemId">;

export interface FavouritesContextValue {
    favourites: Favourite[];
    loaded: boolean;
    toggle: (fav: FavouriteRef) => void;
    isFavourite: (fav: Partial<Favourite>) => boolean;
    signedIn: boolean;
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

/**
 * The signed-in user's favourited menu items, loaded once and shared by every
 * page — one read per session instead of one per page that shows a heart.
 *
 * Toggling updates local state first and writes in the background: a heart
 * that waits on a round trip feels broken. Writes are serialised and always
 * send the latest list, so a slow earlier save can't land after (and undo) a
 * later one. Favourites aren't critical, so a failed write is just logged.
 */
export function FavouritesProvider({ children }: { children: ReactNode }) {
    const { user } = useUserAuth();
    const [favourites, setFavourites] = useState<Favourite[]>([]);
    const [loaded, setLoaded] = useState(false);

    // Latest list, readable from async save callbacks without stale closures.
    const latest = useRef(favourites);
    const saveQueue = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        let cancelled = false;
        latest.current = [];

        if (!user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFavourites([]);
            setLoaded(true);
            return;
        }

        setLoaded(false);
        fetchFavourites(user.uid)
            .then((stored) => {
                if (cancelled) return;
                latest.current = stored;
                setFavourites(stored);
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
        (fav: FavouriteRef) => {
            if (!user) {
                toast.error("Sign in to save favourites");
                return;
            }

            const before = latest.current;
            const after = toggleFavourite(before, fav);
            if (after === before) return;

            latest.current = after;
            setFavourites(after);

            const uid = user.uid;
            saveQueue.current = saveQueue.current
                .then(() => saveFavourites(uid, latest.current))
                .catch((error) => console.error("Failed to save favourites:", error));
        },
        [user]
    );

    const keys = useMemo(() => new Set(favourites.map(favouriteKey)), [favourites]);
    const isFavourite = useCallback(
        (fav: Partial<Favourite>) => keys.has(favouriteKey(fav)),
        [keys]
    );

    const value = useMemo<FavouritesContextValue>(
        () => ({ favourites, loaded, toggle, isFavourite, signedIn: Boolean(user) }),
        [favourites, loaded, toggle, isFavourite, user]
    );

    return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavourites() {
    const context = useContext(FavouritesContext);
    if (!context) throw new Error("useFavourites must be used within FavouritesProvider");
    return context;
}
