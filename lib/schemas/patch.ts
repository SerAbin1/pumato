import type { z } from "zod";

/**
 * Validates a partial update against only the keys it supplies.
 *
 * `.partial()` is unsafe for updateDoc patches in Zod 4: missing keys still run
 * through their `.default()`, so `{ isVisible: false }` would come back with
 * `itemName: ""` etc. and overwrite the stored values. Keys the schema does not
 * define are dropped, as `.partial()` did.
 */
export function parsePatch<S extends z.ZodObject>(schema: S, data: object): Partial<z.output<S>> {
    const keys = Object.fromEntries(
        Object.keys(data)
            .filter((key) => key in schema.shape)
            .map((key) => [key, true])
    );
    return schema.pick(keys as Record<string, true>).parse(data) as Partial<z.output<S>>;
}
