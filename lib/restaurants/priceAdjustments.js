export const PRICE_CHANGE_FIXED = "fixed";
export const PRICE_CHANGE_PERCENT = "percent";

export const roundPrice = (price) => Math.round(price);

export const isItemAffected = (item, options = {}) => {
    const {
        excludedItemIds = [],
        excludedCategories = [],
        excludedLightItemIds = [],
        excludedHeavyItemIds = [],
    } = options;

    return !(
        excludedItemIds.includes(item.id) ||
        excludedCategories.includes(item.category) ||
        excludedLightItemIds.includes(item.id) ||
        excludedHeavyItemIds.includes(item.id)
    );
};

export const getAffectedItemsCount = (menu, options = {}) =>
    (menu || []).filter((item) => isItemAffected(item, options)).length;

export const applyPriceChange = (menu, { mode, value, ...options }) =>
    (menu || []).map((item) => {
        if (!isItemAffected(item, options)) return item;

        const currentPrice = parseFloat(item.price) || 0;
        const newPrice =
            mode === PRICE_CHANGE_PERCENT ? currentPrice * (1 + value / 100) : currentPrice + value;

        return { ...item, price: roundPrice(Math.max(0, newPrice)).toString() };
    });

export const reversePriceChange = (menu, { mode, value }) =>
    (menu || []).map((item) => {
        const currentPrice = parseFloat(item.price) || 0;
        const originalPrice =
            mode === PRICE_CHANGE_PERCENT ? currentPrice / (1 + value / 100) : currentPrice - value;

        return { ...item, price: roundPrice(Math.max(0, originalPrice)).toString() };
    });
