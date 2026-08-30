/**
 * Pure derivations over a customer's past orders.
 * Everything here takes already-fetched orders so it stays testable.
 */

/** Statuses that mean the order is done with, one way or another. */
const CLOSED_STATUSES = new Set(["delivered", "cancelled"]);

/** Customer-facing wording. Internal states the customer shouldn't have to parse. */
export const CUSTOMER_STATUS_LABELS = {
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

export const customerStatusLabel = (status) => CUSTOMER_STATUS_LABELS[status] || "Placed";

/** An order still moving through the pipeline, as opposed to history. */
export const isActiveOrder = (order) => !CLOSED_STATUSES.has(order?.status);

/**
 * Splits history into the orders still in flight and the ones that are done.
 * @param {Array} orders - Newest first
 * @returns {{ active: Array, past: Array }}
 */
export function partitionOrders(orders = []) {
    const active = [];
    const past = [];
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
const itemKey = (item) => `${item.restaurantId || ""}:${item.id || item.name}`;

/**
 * Distinct items the customer has ordered before, most recently ordered first.
 *
 * Cancelled orders are excluded — a cancelled order isn't evidence of a
 * preference, and re-suggesting it is a bad experience when the reason it was
 * cancelled was that the item never arrived.
 *
 * @param {Array} orders - Orders newest first, each with `items`
 * @param {Object} [options]
 * @param {number} [options.limit] - Cap on how many distinct items to return
 * @returns {Array} - Items with `timesOrdered` and their originating order fields
 */
export function getRecentlyOrderedItems(orders = [], { limit = 12 } = {}) {
    const seen = new Map();

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
 * @param {Array} orders
 * @returns {number}
 */
export const totalSpent = (orders = []) =>
    orders
        .filter((o) => o?.status === "delivered")
        .reduce((sum, o) => sum + (Number(o.finalTotal) || 0), 0);
