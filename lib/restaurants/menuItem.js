// Every menu item carries a signed delivery weight. The sign says how the item
// counts towards the extra delivery charge, the magnitude says by how much:
//
//    1 — normal, one unit per qty
//    2 — heavy, one qty is two units
//   -2 — light, two qty count as one unit
//
// Items that predate the field, or carry a zero/unparseable value, are normal.
//
// A variant may carry its own weight (a large pizza at 2 while the item is 1).
// It overrides the item's weight; a variant without one inherits it.
const parseWeight = (value) => {
    const weight = parseInt(value);
    return Number.isFinite(weight) && weight !== 0 ? weight : null;
};

// The variant's own weight, or null when it inherits the item's.
export const getVariantWeight = (variant) => parseWeight(variant?.weight);

// Accepts a menu item or a cart line; a cart line's selected variant wins.
export const getItemWeight = (item) =>
    getVariantWeight(item?.variant) ?? parseWeight(item?.weight) ?? 1;

export const isLightItem = (item) => getItemWeight(item) < 0;
export const isHeavyItem = (item) => getItemWeight(item) > 1;
