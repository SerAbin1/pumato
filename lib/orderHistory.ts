import type { MenuSource } from "@/lib/favourites";

/**
 * Pure derivations over a customer's past orders.
 * Everything here takes already-fetched orders so it stays testable.
 */

/** Statuses that mean the order is done with, one way or another. */
const CLOSED_STATUSES = new Set<string | undefined>(["delivered", "cancelled"]);

/** The parts of an order document these helpers read. */
export interface OrderLike {
    status?: string;
    items?: OrderLineLike[];
    finalTotal?: number | string;
    createdAt?: unknown;
}

export interface OrderLineLike {
    id?: string;
    name?: string;
    price?: string | number;
    unitPrice?: number;
    restaurantId?: string;
    restaurantName?: string;
    category?: string;
    isVeg?: boolean | null;
    image?: string;
}

export interface RecentItem {
    id?: string;
    name?: string;
    price?: string | number;
    restaurantId?: string;
    restaurantName?: string;
    category?: string;
    isVeg?: boolean | null;
    image?: string;
    lastOrderedAt: unknown;
    timesOrdered: number;
}

/** Customer-facing wording. Internal states the customer shouldn't have to parse. */
export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
    placed: "Placed",
    confirmed: "Confirmed",
    viewed: "Being prepared",
    ready_for_delivery: "Ready",
    out_of_stock: "Item unavailable",
    oos_acknowledged: "Item unavailable",
    picked_up: "On the way",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

export const customerStatusLabel = (status: string): string =>
    CUSTOMER_STATUS_LABELS[status] || "Placed";

/** An order still moving through the pipeline, as opposed to history. */
export const isActiveOrder = (order: OrderLike | null | undefined): boolean =>
    !CLOSED_STATUSES.has(order?.status);

/**
 * Splits history into the orders still in flight and the ones that are done.
 * @param orders - Newest first
 */
export function partitionOrders<O extends OrderLike>(orders: O[] = []): { active: O[]; past: O[] } {
    const active: O[] = [];
    const past: O[] = [];
    for (const order of orders) {
        (isActiveOrder(order) ? active : past).push(order);
    }
    return { active, past };
}

/**
 * Identity of a menu item across orders. Variants and addons deliberately do
 * not participate: someone who ordered a half plate still wants "reorder this
 * dish" to point at the dish.
 */
const itemKey = (item: OrderLineLike) => `${item.restaurantId || ""}:${item.id || item.name}`;

/**
 * Distinct items the customer has ordered before, most recently ordered first.
 *
 * Cancelled orders are excluded — a cancelled order isn't evidence of a
 * preference, and re-suggesting it is a bad experience when the reason it was
 * cancelled was that the item never arrived.
 *
 * @param orders - Orders newest first, each with `items`
 * @param options.limit - Cap on how many distinct items to return
 * @returns Items with `timesOrdered` and their originating order fields
 */
export function getRecentlyOrderedItems(
    orders: OrderLike[] = [],
    { limit = 12 }: { limit?: number } = {}
): RecentItem[] {
    const seen = new Map<string, RecentItem>();

    for (const order of orders) {
        if (order?.status === "cancelled") continue;

        for (const item of order.items || []) {
            if (!item?.id && !item?.name) continue;
            const key = itemKey(item);
            const existing = seen.get(key);

            if (existing) {
                // Orders arrive newest first, so the first sighting is the most
                // recent one — keep it and just count the repeat.
                existing.timesOrdered += 1;
                continue;
            }

            seen.set(key, {
                id: item.id,
                name: item.name,
                price: item.unitPrice ?? item.price,
                restaurantId: item.restaurantId,
                restaurantName: item.restaurantName,
                category: item.category,
                isVeg: item.isVeg,
                image: item.image,
                lastOrderedAt: order.createdAt ?? null,
                timesOrdered: 1,
            });
        }
    }

    return [...seen.values()].slice(0, limit);
}

/**
 * Total a customer has spent on the orders that actually completed.
 */
export const totalSpent = (orders: OrderLike[] = []): number =>
    orders
        .filter((o) => o?.status === "delivered")
        .reduce((sum, o) => sum + (Number(o.finalTotal) || 0), 0);

/**
 * Pairs each "order again" item with the live menu item behind it.
 *
 * A past order snapshots price at the time it was placed, so reordering from
 * the snapshot would charge a stale price and happily add an item that has
 * since been hidden, marked out of stock, or deleted. Price, weight and
 * availability always come from the restaurant document instead.
 *
 * @param items - From `getRecentlyOrderedItems`
 * @returns items with `live` (menu item or null), current `price`,
 *   `available`, and `needsChoice` (variants/addons must be picked on the menu)
 */
export function resolveReorderItems<
    I extends Pick<RecentItem, "id" | "name" | "price" | "restaurantId" | "restaurantName">,
>(items: I[] = [], restaurants: MenuSource[] = []) {
    const byId = new Map(restaurants.map((r) => [r.id, r]));

    return items.map((item) => {
        const restaurant = byId.get(item.restaurantId as string);
        const live =
            restaurant?.menu?.find((m) => (item.id ? m.id === item.id : m.name === item.name)) ||
            null;
        const outOfStock =
            live?.isVisible === false ||
            (restaurant?.outOfStockCategories || []).includes(live?.category as string);
        const needsChoice = Boolean(live?.variants?.length || live?.addons?.length);

        return {
            ...item,
            name: live?.name || item.name,
            restaurantName: restaurant?.name || item.restaurantName,
            price: live ? live.price : item.price,
            live,
            available: Boolean(live) && restaurant?.isVisible !== false && !outOfStock,
            needsChoice,
        };
    });
}
