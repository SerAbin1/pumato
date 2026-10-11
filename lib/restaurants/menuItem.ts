import Fuse from "fuse.js";

// Delivery weights are shared with server-side pricing, so they live with it.
export {
    getVariantWeight,
    getItemWeight,
    isLightItem,
    isHeavyItem,
} from "@/functions/src/order-flow/pricing";
export type { Weighted } from "@/functions/src/order-flow/pricing";

// Below this many variants + addons a search box in the customize modal is clutter.
export const OPTION_SEARCH_MIN = 6;

const fuzzyByName = <T extends { name: string }>(list: T[], query: string): T[] =>
    query
        ? new Fuse(list, { keys: ["name"], threshold: 0.3 }).search(query).map((r) => r.item)
        : list;

// The customize-modal options matching a search. The base option is the item
// itself (no variant picked), so it matches against the item's own name — and
// only exists when there are variants to pick between.
export function searchItemOptions<V extends { name: string }, A extends { name: string }>(
    item: { name?: string; variants?: V[]; addons?: A[] } | null | undefined,
    query = ""
) {
    const q = query.trim();
    const variants = fuzzyByName(item?.variants || [], q);
    const addons = fuzzyByName(item?.addons || [], q);
    const base =
        Boolean(item?.variants?.length) && fuzzyByName([{ name: item?.name || "" }], q).length > 0;
    return { base, variants, addons, empty: !base && !variants.length && !addons.length };
}

/**
 * A menu item added to the cart as-is (no customisation). Its `variants` and
 * `addons` are the menu's option lists, not selections, and only items without
 * options are added this way, so they're dropped rather than carried into the
 * cart line where `addons` means "chosen addons".
 */
export function plainCartLine<T extends { variants?: unknown; addons?: unknown }>(
    item: T
): Omit<T, "variants" | "addons"> {
    const { variants: _variants, addons: _addons, ...line } = item;
    return line;
}
