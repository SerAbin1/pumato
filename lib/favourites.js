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
export const favouriteKey = (fav) => `${fav?.restaurantId || ""}:${fav?.itemId || ""}`;

/** @returns {boolean} whether this item is already favourited */
export const isFavourite = (favourites = [], fav) =>
    favourites.some((f) => favouriteKey(f) === favouriteKey(fav));

/**
 * Adds or removes a favourite, newest first.
 * Pure — returns a new array and never mutates the input.
 *
 * @param {Array} favourites - Current list
 * @param {{restaurantId: string, itemId: string, name?: string}} fav
 * @returns {Array} the updated list
 */
export function toggleFavourite(favourites = [], fav) {
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
 * @param {Array} favourites - Stored favourites
 * @param {Array} restaurants - Restaurant documents with `menu`
 * @returns {Array} entries with `item` (or null when it's gone) and `available`
 */
export function resolveFavourites(favourites = [], restaurants = []) {
    const byId = new Map(restaurants.map((r) => [r.id, r]));

    return favourites.map((fav) => {
        const restaurant = byId.get(fav.restaurantId);
        const item = restaurant?.menu?.find((m) => m.id === fav.itemId) || null;
        const outOfStock =
            item?.isVisible === false ||
            (restaurant?.outOfStockCategories || []).includes(item?.category);

        return {
            ...fav,
            name: item?.name || fav.name,
            restaurantName: restaurant?.name || "",
            item,
            available: Boolean(item) && restaurant?.isVisible !== false && !outOfStock,
        };
    });
}
