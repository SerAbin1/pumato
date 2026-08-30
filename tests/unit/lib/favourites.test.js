"use strict";

import { describe, it, expect } from "vitest";
import {
    favouriteKey,
    isFavourite,
    toggleFavourite,
    resolveFavourites,
    MAX_FAVOURITES,
} from "../../../lib/favourites";

const fav = (overrides = {}) => ({
    restaurantId: "res-1",
    itemId: "biryani",
    name: "Chicken Biryani",
    ...overrides,
});

describe("favouriteKey / isFavourite", () => {
    it("scopes an item to its restaurant", () => {
        // Menu items are embedded in restaurant docs, so ids are only unique
        // within a restaurant.
        expect(favouriteKey(fav())).toBe("res-1:biryani");
        expect(favouriteKey(fav({ restaurantId: "res-2" }))).not.toBe(favouriteKey(fav()));
    });

    it("matches on identity, ignoring the stored display name", () => {
        const list = [fav({ name: "Old Name" })];

        expect(isFavourite(list, { restaurantId: "res-1", itemId: "biryani" })).toBe(true);
    });

    it("does not match the same item id at another restaurant", () => {
        expect(isFavourite([fav()], fav({ restaurantId: "res-2" }))).toBe(false);
    });

    it("handles an empty list", () => {
        expect(isFavourite([], fav())).toBe(false);
        expect(isFavourite(undefined, fav())).toBe(false);
    });
});

describe("toggleFavourite", () => {
    it("adds a new favourite at the front", () => {
        const existing = [fav({ itemId: "naan", name: "Butter Naan" })];
        const next = toggleFavourite(existing, fav());

        expect(next).toHaveLength(2);
        expect(next[0].itemId).toBe("biryani");
    });

    it("removes one already saved", () => {
        expect(toggleFavourite([fav()], fav())).toEqual([]);
    });

    it("stores only identity plus a display name", () => {
        const next = toggleFavourite([], { ...fav(), price: 180, description: "spicy" });

        expect(next[0]).toEqual({
            restaurantId: "res-1",
            itemId: "biryani",
            name: "Chicken Biryani",
        });
    });

    it("never mutates the input", () => {
        const existing = [fav()];
        const snapshot = structuredClone(existing);

        toggleFavourite(existing, fav({ itemId: "naan" }));
        toggleFavourite(existing, fav());

        expect(existing).toEqual(snapshot);
    });

    it("ignores an entry missing its identity", () => {
        const existing = [fav()];

        expect(toggleFavourite(existing, { itemId: "biryani" })).toBe(existing);
        expect(toggleFavourite(existing, { restaurantId: "res-1" })).toBe(existing);
        expect(toggleFavourite(existing, {})).toBe(existing);
    });

    it("drops the oldest entry past the cap rather than refusing the new one", () => {
        // The list lives on one document, so it has to stay bounded — but a
        // silent "couldn't favourite that" is worse than forgetting an old star.
        const full = Array.from({ length: MAX_FAVOURITES }, (_, i) =>
            fav({ itemId: `item-${i}`, name: `Item ${i}` })
        );
        const next = toggleFavourite(full, fav({ itemId: "new", name: "New" }));

        expect(next).toHaveLength(MAX_FAVOURITES);
        expect(next[0].itemId).toBe("new");
        expect(next.some((f) => f.itemId === `item-${MAX_FAVOURITES - 1}`)).toBe(false);
    });
});

describe("resolveFavourites", () => {
    const restaurants = [
        {
            id: "res-1",
            name: "Hotel Ashiana",
            isVisible: true,
            outOfStockCategories: [],
            menu: [{ id: "biryani", name: "Chicken Biryani", price: "180", category: "Biryani" }],
        },
    ];

    it("pairs a favourite with its live menu item", () => {
        const [entry] = resolveFavourites([fav()], restaurants);

        expect(entry.item.price).toBe("180");
        expect(entry.restaurantName).toBe("Hotel Ashiana");
        expect(entry.available).toBe(true);
    });

    it("prefers the live name over the stored one", () => {
        // The stored name is a fallback; a renamed dish should show its new name.
        const [entry] = resolveFavourites([fav({ name: "Stale Name" })], restaurants);

        expect(entry.name).toBe("Chicken Biryani");
    });

    it("keeps the entry when the item is gone, marked unavailable", () => {
        const [entry] = resolveFavourites([fav({ itemId: "deleted" })], restaurants);

        expect(entry.item).toBeNull();
        expect(entry.available).toBe(false);
        expect(entry.name).toBe("Chicken Biryani"); // falls back to what was stored
    });

    it("keeps the entry when the whole restaurant is gone", () => {
        const [entry] = resolveFavourites([fav({ restaurantId: "closed" })], restaurants);

        expect(entry.available).toBe(false);
        expect(entry.restaurantName).toBe("");
    });

    it("marks a hidden item unavailable", () => {
        const hidden = [
            { ...restaurants[0], menu: [{ ...restaurants[0].menu[0], isVisible: false }] },
        ];

        expect(resolveFavourites([fav()], hidden)[0].available).toBe(false);
    });

    it("marks an item unavailable when its category is out of stock", () => {
        const oos = [{ ...restaurants[0], outOfStockCategories: ["Biryani"] }];

        expect(resolveFavourites([fav()], oos)[0].available).toBe(false);
    });

    it("marks everything unavailable when the restaurant is offline", () => {
        const offline = [{ ...restaurants[0], isVisible: false }];

        expect(resolveFavourites([fav()], offline)[0].available).toBe(false);
    });

    it("handles empty inputs", () => {
        expect(resolveFavourites([], restaurants)).toEqual([]);
        expect(resolveFavourites()).toEqual([]);
        expect(resolveFavourites([fav()], [])[0].available).toBe(false);
    });
});
