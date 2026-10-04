/**
 * Shallow diff of a settings object against its Firestore baseline.
 * Only top-level keys present in `current` are considered — a key the baseline
 * has but `current` doesn't is left alone rather than reported as a deletion,
 * since settings saves are merges, not replacements.
 *
 * With no baseline (fetch failed, or the doc doesn't exist yet) everything is
 * treated as changed, so a first save writes the whole object.
 *
 * @param {Object|null} baseline - Last known saved state
 * @param {Object} current - Current form state
 * @returns {Object} - Keys whose values changed, with their new values
 */
export const computeDiff = <T extends Record<string, unknown>>(
    baseline: Record<string, unknown> | null | undefined,
    current: T
): Partial<T> => {
    if (!baseline) return current;
    const diff: Partial<T> = {};
    for (const [key, value] of Object.entries(current)) {
        if (JSON.stringify(value) !== JSON.stringify(baseline[key])) {
            diff[key as keyof T] = value as T[keyof T];
        }
    }
    return diff;
};

/**
 * Whether `computeDiff` would report any change.
 * @param {Object|null} baseline
 * @param {Object} current
 * @returns {boolean}
 */
export const hasChanges = (
    baseline: Record<string, unknown> | null | undefined,
    current: Record<string, unknown>
): boolean => Object.keys(computeDiff(baseline, current)).length > 0;
