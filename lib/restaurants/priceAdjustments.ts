import { isLightItem, isHeavyItem } from "./menuItem";
import type { Weighted } from "./menuItem";

export const PRICE_CHANGE_FIXED = "fixed";
export const PRICE_CHANGE_PERCENT = "percent";
export type PriceChangeMode = typeof PRICE_CHANGE_FIXED | typeof PRICE_CHANGE_PERCENT;

export interface PriceChangeScope {
    excludedItemIds?: string[];
    excludedCategories?: string[];
    excludeLightItems?: boolean;
    excludeHeavyItems?: boolean;
}

export interface PriceChange {
    mode: PriceChangeMode | string;
    value: number;
}

/** The menu-item fields a price change reads and writes. */
export type PricedMenuItem = Weighted & { id: string; category: string; price: string };

export const roundPrice = (price: number): number => Math.round(price);

export const isItemAffected = (item: PricedMenuItem, options: PriceChangeScope = {}): boolean => {
    const {
        excludedItemIds = [],
        excludedCategories = [],
        excludeLightItems = false,
        excludeHeavyItems = false,
    } = options;

    if (excludedItemIds.includes(item.id) || excludedCategories.includes(item.category))
        return false;
    if (excludeLightItems && isLightItem(item)) return false;
    if (excludeHeavyItems && isHeavyItem(item)) return false;
    return true;
};

export const getAffectedItemsCount = (
    menu: PricedMenuItem[] | null | undefined,
    options: PriceChangeScope = {}
): number => (menu || []).filter((item) => isItemAffected(item, options)).length;

export const applyPriceChange = <T extends PricedMenuItem>(
    menu: T[] | null | undefined,
    { mode, value, ...options }: PriceChange & PriceChangeScope
): T[] =>
    (menu || []).map((item) => {
        if (!isItemAffected(item, options)) return item;

        const currentPrice = parseFloat(item.price) || 0;
        const newPrice =
            mode === PRICE_CHANGE_PERCENT ? currentPrice * (1 + value / 100) : currentPrice + value;

        return { ...item, price: roundPrice(Math.max(0, newPrice)).toString() };
    });

export const reversePriceChange = <T extends PricedMenuItem>(
    menu: T[] | null | undefined,
    { mode, value }: PriceChange
): T[] =>
    (menu || []).map((item) => {
        const currentPrice = parseFloat(item.price) || 0;
        const originalPrice =
            mode === PRICE_CHANGE_PERCENT ? currentPrice / (1 + value / 100) : currentPrice - value;

        return { ...item, price: roundPrice(Math.max(0, originalPrice)).toString() };
    });
