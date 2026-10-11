/**
 * Items a restaurant runs out of are off the menu for the rest of the day
 * (IST) and come back on their own at midnight, rather than staying hidden
 * until someone remembers to switch them back on.
 */

// IST has no daylight saving: always UTC+05:30.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The next midnight in IST after `now`. */
const nextIstMidnight = (now: Date): Date => {
    const istDayStart = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS;
    return new Date(istDayStart + DAY_MS - IST_OFFSET_MS);
};

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
