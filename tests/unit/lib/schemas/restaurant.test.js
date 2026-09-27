"use strict";

import { describe, it, expect } from "vitest";
import { RestaurantSchema } from "../../../../lib/schemas/restaurant";

const restaurant = (menu = []) => ({
    id: "r1",
    name: "Spice Hub",
    image: "",
    cuisine: "Indian",
    deliveryTime: "30 mins",
    baseDeliveryCharge: "30",
    extraItemThreshold: "3",
    extraItemCharge: "10",
    minOrderAmount: "0",
    isVisible: true,
    categories: ["STARTERS"],
    menu,
});

const menuItem = (overrides = {}) => ({
    id: "m1",
    name: "Chappati",
    price: "20",
    description: "",
    category: "STARTERS",
    isVeg: true,
    isVisible: true,
    ...overrides,
});

describe("RestaurantSchema - menu item weight", () => {
    it("keeps a heavy item's weight through a save", () => {
        const saved = RestaurantSchema.parse(restaurant([menuItem({ weight: 3 })]));
        expect(saved.menu[0].weight).toBe(3);
    });

    it("keeps a light item's negative weight through a save", () => {
        const saved = RestaurantSchema.parse(restaurant([menuItem({ weight: -2 })]));
        expect(saved.menu[0].weight).toBe(-2);
    });

    it("coerces a weight typed into the form as a string", () => {
        const saved = RestaurantSchema.parse(restaurant([menuItem({ weight: "-2" })]));
        expect(saved.menu[0].weight).toBe(-2);
    });

    it("leaves an item that never had a weight alone", () => {
        const saved = RestaurantSchema.parse(restaurant([menuItem()]));
        expect(saved.menu[0].weight).toBeUndefined();
    });
});
