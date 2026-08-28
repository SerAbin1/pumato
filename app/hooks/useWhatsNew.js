"use client";

import { useCallback, useEffect, useState } from "react";
import { ANNOUNCEMENT, parseAnnouncementDate } from "@/lib/announcements";

const STORAGE_KEY = "pumato:whatsNew:lastSeenDate";

/**
 * Tracks whether the current "What's New" announcement has been seen on this
 * device, persisted in localStorage so it's never re-shown after being opened.
 *
 * @returns {{announcement: object|null, hasUnseen: boolean, markSeen: () => void}}
 */
export function useWhatsNew() {
    const [hasUnseen, setHasUnseen] = useState(false);

    useEffect(() => {
        if (!ANNOUNCEMENT) return;

        let lastSeen = null;
        try {
            lastSeen = localStorage.getItem(STORAGE_KEY);
        } catch {
            return;
        }

        const isUnseen =
            !lastSeen || parseAnnouncementDate(ANNOUNCEMENT.date) > parseAnnouncementDate(lastSeen);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHasUnseen(isUnseen);
    }, []);

    const markSeen = useCallback(() => {
        if (!ANNOUNCEMENT) return;
        try {
            localStorage.setItem(STORAGE_KEY, ANNOUNCEMENT.date);
        } catch {
            // localStorage unavailable (e.g. private browsing) - fail silently
        }
        setHasUnseen(false);
    }, []);

    return { announcement: ANNOUNCEMENT, hasUnseen, markSeen };
}
