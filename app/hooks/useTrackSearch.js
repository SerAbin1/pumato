"use client";

import { useEffect, useRef } from "react";
import { trackSearch } from "@/lib/analytics";

// Fires a `search` analytics event once a query stops changing for a bit,
// instead of on every keystroke.
export function useTrackSearch(term, resultsCount, source) {
    const lastTracked = useRef("");

    useEffect(() => {
        const trimmed = term?.trim();
        if (!trimmed) {
            lastTracked.current = "";
            return;
        }

        const handle = setTimeout(() => {
            if (trimmed === lastTracked.current) return;
            lastTracked.current = trimmed;
            trackSearch(trimmed, { resultsCount, source });
        }, 800);

        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [term, source]);
}
