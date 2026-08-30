import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { computeDiff } from "@/lib/diff";

/**
 * Owns one settings tab's fetch → baseline → diff → save cycle.
 *
 * Each tab gets its own instance, so one tab's failed fetch can't gate another
 * tab's Save button and one tab's diff can't be conflated with another's — the
 * root cause behind both the coupons-CORS and grocery-silent-noop bugs.
 *
 * A form whose own load failed reports `canSave: false` and refuses to save,
 * since without a trustworthy baseline every field looks changed.
 *
 * @param {Object} options
 * @param {Function} options.load - async () => data. Errors are caught and surfaced.
 * @param {Function} options.save - async ({ diff, data }) => void. Pick `diff` for
 *   documents written with `{merge: true}`, `data` for full-document overwrites.
 * @param {string} options.label - Human name used in toasts ("Delivery settings").
 * @param {Object} [options.initial] - State to show before the first load resolves.
 * @param {boolean} [options.confirm] - Route the save through a confirmation step.
 */
export function useSettingsForm({ load, save, label, initial = {}, confirm = false }) {
    const [data, setData] = useState(initial);
    const [baseline, setBaseline] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pending, setPending] = useState(null);

    // Callers pass `initial` as a literal, so pin the first one rather than
    // letting a fresh object each render invalidate `reload`.
    const initialRef = useRef(initial);

    const reload = useCallback(async () => {
        setLoaded(false);
        try {
            const result = await load();
            // A document that doesn't exist yet still gives a real baseline — the
            // starting state — so "nothing changed" stays distinguishable from
            // "we never found out what's there".
            const next = result ?? initialRef.current;
            setData(next);
            setBaseline(next);
            setFailed(false);
        } catch (error) {
            console.error(`Failed to load ${label}:`, error);
            toast.error(`Failed to load ${label.toLowerCase()}`);
            // No baseline means every field reads as changed, which for the
            // full-overwrite documents would save a near-empty object over live
            // data. Block saving on this form until a load succeeds — and only
            // this form, so one tab's fetch failure can't gate another's.
            setFailed(true);
        } finally {
            setLoaded(true);
        }
    }, [load, label]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        reload();
    }, [reload]);

    const diff = useMemo(() => computeDiff(baseline, data), [baseline, data]);
    const hasChanges = Object.keys(diff).length > 0;
    const canSave = loaded && !failed;

    const commit = useCallback(async () => {
        setIsSaving(true);
        try {
            await save({ diff, data });
            setBaseline(data);
            toast.success(`${label} saved!`);
        } catch (error) {
            console.error(`Failed to save ${label}:`, error);
            toast.error(`Failed to save ${label.toLowerCase()}`);
        } finally {
            setIsSaving(false);
            setPending(null);
        }
    }, [save, diff, data, label]);

    /** Save, or stage the diff for confirmation when `confirm` is set. */
    const requestSave = useCallback(() => {
        if (!canSave || !hasChanges) return;
        if (confirm) {
            setPending(diff);
            return;
        }
        commit();
    }, [canSave, hasChanges, confirm, diff, commit]);

    return {
        data,
        setData,
        loaded,
        failed,
        canSave,
        isSaving,
        diff,
        hasChanges,
        requestSave,
        confirmSave: commit,
        cancelSave: useCallback(() => setPending(null), []),
        pending,
        reload,
    };
}
