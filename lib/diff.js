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
export const computeDiff = (baseline, current) => {
    if (!baseline) return current;
    const diff = {};
    for (const [key, value] of Object.entries(current)) {
        if (JSON.stringify(value) !== JSON.stringify(baseline[key])) {
            diff[key] = value;
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
export const hasChanges = (baseline, current) =>
    Object.keys(computeDiff(baseline, current)).length > 0;
