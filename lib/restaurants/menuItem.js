import Fuse from "fuse.js";

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

// Below this many variants + addons a search box in the customize modal is clutter.
export const OPTION_SEARCH_MIN = 6;

const fuzzyByName = (list, query) =>
    query
        ? new Fuse(list, { keys: ["name"], threshold: 0.3 }).search(query).map((r) => r.item)
        : list;

// The customize-modal options matching a search. The base option is the item
// itself (no variant picked), so it matches against the item's own name — and
// only exists when there are variants to pick between.
export function searchItemOptions(item, query = "") {
    const q = query.trim();
    const variants = fuzzyByName(item?.variants || [], q);
    const addons = fuzzyByName(item?.addons || [], q);
    const base =
        Boolean(item?.variants?.length) && fuzzyByName([{ name: item.name || "" }], q).length > 0;
    return { base, variants, addons, empty: !base && !variants.length && !addons.length };
}
