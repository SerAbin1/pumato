import type { LaundryCategory, LaundryPricing } from "@/lib/types";
import type { LaundryItemDraft } from "./types";

export const DEFAULT_WEIGHT_KG = 5;

/** One per-kg line on the estimate, for a wash type in use. */
export interface LaundryEstimateLine {
    key: string;
    label: string;
    pricePerKg: number;
    weight: number;
    amount: number;
}

export interface LaundryEstimate {
    lines: LaundryEstimateLine[];
    steamIronCount: number;
    steamIronAmount: number;
    total: number;
}

/** Wash types users can pick; a category without a name is still being set up by an admin. */
export function selectableCategories(pricing: LaundryPricing): LaundryCategory[] {
    return pricing.categories.filter((c) => c.name.trim().length > 0);
}

/** Whether an item may be steam ironed: only if its wash type allows it. */
export function allowsSteamIron(categories: LaundryCategory[], categoryId: string): boolean {
    return !!categories.find((c) => c.id === categoryId)?.steamIronEnabled;
}

/**
 * Prices the pickup form: each wash type in use is charged by the weight the user
 * estimates for it, plus steam ironing per piece where it's allowed.
 */
export function estimateLaundry(
    items: LaundryItemDraft[],
    pricing: LaundryPricing,
    weights: Record<string, number>
): LaundryEstimate {
    const categories = selectableCategories(pricing);

    const lines = categories
        .filter((c) => items.some((i) => i.categoryId === c.id))
        .map((c) => {
            const pricePerKg = Number(c.pricePerKg) || 0;
            const weight = weights[c.id] ?? DEFAULT_WEIGHT_KG;
            return {
                key: c.id,
                label: c.name,
                pricePerKg,
                weight,
                amount: Math.round(weight * pricePerKg),
            };
        });

    const steamIronCount = items.reduce(
        (acc, i) =>
            i.steamIron && allowsSteamIron(categories, i.categoryId)
                ? acc + (Number(i.quantity) || 1)
                : acc,
        0
    );
    const steamIronAmount = steamIronCount * (Number(pricing.steamIronPrice) || 0);

    return {
        lines,
        steamIronCount,
        steamIronAmount,
        total: lines.reduce((acc, l) => acc + l.amount, 0) + steamIronAmount,
    };
}
