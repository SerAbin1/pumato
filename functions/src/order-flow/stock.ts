/**
 * Items a restaurant runs out of are off the menu for the rest of the day
 * (IST) and come back on their own at midnight, rather than staying hidden
 * until someone remembers to switch them back on.
 */

import { nextIstMidnight } from "../ist";

interface StockedItem {
    id: string;
    isVisible: boolean;
}

export function markOutOfStockForDay<T extends StockedItem>(
    menu: T[],
    itemIds: string[],
    now: Date
): T[] {
    const until = nextIstMidnight(now).toISOString();
    return menu.map((item) =>
        itemIds.includes(item.id)
            ? { ...item, isVisible: false, hiddenAt: now.toISOString(), outOfStockUntil: until }
            : item
    );
}

/**
 * Puts back items whose out-of-stock day has ended. Items hidden by hand carry
 * no `outOfStockUntil`, so they stay hidden.
 */
export function restoreExpiredStock<T extends StockedItem & { outOfStockUntil?: string | null }>(
    menu: T[],
    now: Date
): { menu: T[]; restoredIds: string[] } {
    const restoredIds: string[] = [];
    const restored = menu.map((item) => {
        if (!item.outOfStockUntil || new Date(item.outOfStockUntil) > now) return item;
        restoredIds.push(item.id);
        return { ...item, isVisible: true, hiddenAt: null, outOfStockUntil: null };
    });
    return { menu: restored, restoredIds };
}
