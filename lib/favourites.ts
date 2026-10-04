import type { MenuItem, Restaurant } from "@/lib/types";

/**
 * Favourites live as one array on the user's own document, so the whole list
 * costs a single read. That bounds how many we can hold — hence MAX_FAVOURITES,
 * which keeps the document far below Firestore's 1MB limit no matter how long
 * item names get.
 */
export const MAX_FAVOURITES = 200;

/**
 * A favourite identifies a menu item within a restaurant. Menu items are
 * embedded in the restaurant document, so an item id alone isn't unique.
 */
export interface Favourite {
    restaurantId: string;
    itemId: string;
    name?: string;
}

type FavouriteRef = Partial<Favourite> | null | undefined;

/** What resolving against a live menu reads from each menu item. */
export interface LiveMenuItem {
    id: string;
    name?: string;
    category?: string;
    isVisible?: boolean;
}

/** The fields of a restaurant that favourites/reorders resolve against. */
export type MenuSource<M extends LiveMenuItem = MenuItem> = Pick<Restaurant, "id" | "name"> &
    Partial<Pick<Restaurant, "outOfStockCategories" | "isVisible">> & { menu?: M[] };

export const favouriteKey = (fav: FavouriteRef): string =>
    `${fav?.restaurantId || ""}:${fav?.itemId || ""}`;

/** @returns {boolean} whether this item is already favourited */
export const isFavourite = (favourites: FavouriteRef[] = [], fav: FavouriteRef): boolean =>
    favourites.some((f) => favouriteKey(f) === favouriteKey(fav));

/**
 * Adds or removes a favourite, newest first.
 * Pure — returns a new array and never mutates the input.
 *
 * @returns the updated list
 */
export function toggleFavourite(favourites: Favourite[] = [], fav: FavouriteRef): Favourite[] {
    if (!fav?.restaurantId || !fav?.itemId) return favourites;

    const key = favouriteKey(fav);
    if (favourites.some((f) => favouriteKey(f) === key)) {
        return favourites.filter((f) => favouriteKey(f) !== key);
    }

    // Oldest entries fall off the end rather than rejecting the new one — a
    // silent "couldn't favourite that" is worse than quietly forgetting the
    // thing you starred two hundred items ago.
    return [
        { restaurantId: fav.restaurantId, itemId: fav.itemId, name: fav.name || "" },
        ...favourites,
    ].slice(0, MAX_FAVOURITES);
}

/**
 * Pairs each favourite with the live menu item behind it.
 *
 * Menu items can be deleted, renamed or repriced after being favourited, so
 * the stored `name` is only a fallback for display — price and availability
 * always come from the restaurant document.
 *
 * @returns entries with `item` (or null when it's gone) and `available`
 */
export type ResolvedFavourite<M extends LiveMenuItem = MenuItem> = ReturnType<
    typeof resolveFavourites<M>
>[number];

export function resolveFavourites<M extends LiveMenuItem>(
    favourites: Favourite[] = [],
    restaurants: MenuSource<M>[] = []
) {
    const byId = new Map(restaurants.map((r) => [r.id, r]));

    return favourites.map((fav) => {
        const restaurant = byId.get(fav.restaurantId);
        const item = restaurant?.menu?.find((m) => m.id === fav.itemId) || null;
        const outOfStock =
            item?.isVisible === false ||
            (restaurant?.outOfStockCategories || []).includes(item?.category as string);

        return {
            ...fav,
            name: item?.name || fav.name,
            restaurantName: restaurant?.name || "",
            item,
            available: Boolean(item) && restaurant?.isVisible !== false && !outOfStock,
        };
    });
}
