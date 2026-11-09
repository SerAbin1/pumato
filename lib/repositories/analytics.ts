import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/constants";
import type { DailyRollup } from "@/lib/analytics";

// Daily rollups are stored under site_content? No, top-level collection analytics_daily.
// Add collection name to constants? Use literal to avoid editing constants? Better add constant.

export async function fetchAnalyticsDaily(start: Date, end: Date): Promise<DailyRollup[]> {
    const q = query(
        collection(db, COLLECTIONS.ANALYTICS_DAILY),
        where("date", ">=", start.toISOString().slice(0, 10)),
        where("date", "<=", end.toISOString().slice(0, 10))
    );
    // Note: comparing date strings works for YYYY-MM-DD.
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DailyRollup);
}
