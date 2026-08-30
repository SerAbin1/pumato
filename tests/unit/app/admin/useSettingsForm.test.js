// @vitest-environment jsdom
"use strict";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("react-hot-toast", () => ({ default: toastMock }));

const { useSettingsForm } = await import("@/app/admin/hooks/useSettingsForm");

/** Mounts the hook and waits for the initial load to settle. */
async function mountForm(options) {
    const view = renderHook((props) => useSettingsForm(props), { initialProps: options });
    await waitFor(() => expect(view.result.current.loaded).toBe(true));
    return view;
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(cleanup);

describe("useSettingsForm — loading", () => {
    it("adopts the loaded document as both data and baseline", async () => {
        const { result } = await mountForm({
            label: "Delivery settings",
            load: vi.fn().mockResolvedValue({ baseDeliveryCharge: "10" }),
            save: vi.fn(),
        });

        expect(result.current.data).toEqual({ baseDeliveryCharge: "10" });
        expect(result.current.hasChanges).toBe(false);
        expect(result.current.canSave).toBe(true);
    });

    it("uses `initial` as the baseline when the document does not exist yet", async () => {
        // Without this, a null result leaves baseline null and every field reads
        // as changed — which for a full-overwrite doc is a wipe.
        const { result } = await mountForm({
            label: "Grocery settings",
            initial: { whatsappNumber: "" },
            load: vi.fn().mockResolvedValue(null),
            save: vi.fn(),
        });

        expect(result.current.hasChanges).toBe(false);
        expect(result.current.canSave).toBe(true);
    });
});

describe("useSettingsForm — failed load", () => {
    const failing = (save) => ({
        label: "Grocery settings",
        initial: {},
        load: vi.fn().mockRejectedValue(new Error("offline")),
        save,
    });

    it("marks the form unsaveable and surfaces the failure", async () => {
        const { result } = await mountForm(failing(vi.fn()));

        expect(result.current.failed).toBe(true);
        expect(result.current.canSave).toBe(false);
        expect(toastMock.error).toHaveBeenCalledWith("Failed to load grocery settings");
    });

    it("refuses to save after an edit, rather than overwriting the live document", async () => {
        const save = vi.fn();
        const { result } = await mountForm(failing(save));

        act(() => result.current.setData({ whatsappNumber: "919" }));
        act(() => result.current.requestSave());

        expect(save).not.toHaveBeenCalled();
        expect(result.current.pending).toBeNull();
    });

    it("clears the failure once a reload succeeds", async () => {
        const load = vi
            .fn()
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValue({ whatsappNumber: "919" });
        const { result } = await mountForm({ label: "Grocery settings", load, save: vi.fn() });

        expect(result.current.canSave).toBe(false);

        await act(async () => {
            await result.current.reload();
        });

        expect(result.current.failed).toBe(false);
        expect(result.current.canSave).toBe(true);
        expect(result.current.data).toEqual({ whatsappNumber: "919" });
    });
});

describe("useSettingsForm — saving", () => {
    it("hands the save both the diff and the full data", async () => {
        // order_settings merges (wants diff); grocery_settings overwrites (wants data).
        const save = vi.fn().mockResolvedValue();
        const { result } = await mountForm({
            label: "Delivery settings",
            load: vi.fn().mockResolvedValue({ a: "1", b: "2" }),
            save,
        });

        act(() => result.current.setData({ a: "9", b: "2" }));
        expect(result.current.hasChanges).toBe(true);

        await act(async () => result.current.requestSave());

        expect(save).toHaveBeenCalledWith({ diff: { a: "9" }, data: { a: "9", b: "2" } });
    });

    it("does nothing when there are no changes", async () => {
        const save = vi.fn();
        const { result } = await mountForm({
            label: "Delivery settings",
            load: vi.fn().mockResolvedValue({ a: "1" }),
            save,
        });

        act(() => result.current.requestSave());

        expect(save).not.toHaveBeenCalled();
    });

    it("advances the baseline on success so the form settles clean", async () => {
        const { result } = await mountForm({
            label: "Delivery settings",
            load: vi.fn().mockResolvedValue({ a: "1" }),
            save: vi.fn().mockResolvedValue(),
        });

        act(() => result.current.setData({ a: "9" }));
        await act(async () => result.current.requestSave());

        expect(result.current.hasChanges).toBe(false);
        expect(toastMock.success).toHaveBeenCalledWith("Delivery settings saved!");
    });

    it("keeps the edit pending when the save fails", async () => {
        const { result } = await mountForm({
            label: "Delivery settings",
            load: vi.fn().mockResolvedValue({ a: "1" }),
            save: vi.fn().mockRejectedValue(new Error("permission-denied")),
        });

        act(() => result.current.setData({ a: "9" }));
        await act(async () => result.current.requestSave());

        // Baseline must not advance, or the admin silently loses the change.
        expect(result.current.hasChanges).toBe(true);
        expect(result.current.data).toEqual({ a: "9" });
        expect(toastMock.error).toHaveBeenCalledWith("Failed to save delivery settings");
    });
});

describe("useSettingsForm — confirmation step", () => {
    const withConfirm = (save) => ({
        label: "Global settings",
        confirm: true,
        load: vi.fn().mockResolvedValue({ upiId: "old@upi" }),
        save,
    });

    it("stages the diff without writing", async () => {
        const save = vi.fn();
        const { result } = await mountForm(withConfirm(save));

        act(() => result.current.setData({ upiId: "new@upi" }));
        act(() => result.current.requestSave());

        expect(result.current.pending).toEqual({ upiId: "new@upi" });
        expect(save).not.toHaveBeenCalled();
    });

    it("writes only once confirmed", async () => {
        const save = vi.fn().mockResolvedValue();
        const { result } = await mountForm(withConfirm(save));

        act(() => result.current.setData({ upiId: "new@upi" }));
        act(() => result.current.requestSave());
        await act(async () => result.current.confirmSave());

        expect(save).toHaveBeenCalledTimes(1);
        expect(result.current.pending).toBeNull();
        expect(result.current.hasChanges).toBe(false);
    });

    it("drops the staged diff on cancel, keeping the edit", async () => {
        const save = vi.fn();
        const { result } = await mountForm(withConfirm(save));

        act(() => result.current.setData({ upiId: "new@upi" }));
        act(() => result.current.requestSave());
        act(() => result.current.cancelSave());

        expect(result.current.pending).toBeNull();
        expect(save).not.toHaveBeenCalled();
        expect(result.current.hasChanges).toBe(true);
    });
});
