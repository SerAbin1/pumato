import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { updateFeedback } from "@/lib/repositories";
import toast from "react-hot-toast";
import { Check } from "lucide-react";

export default function FeedbackTab() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(
                query(collection(db, COLLECTIONS.FEEDBACK), orderBy("createdAt", "desc"))
            );
            setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Failed to load feedback:", error);
            toast.error("Failed to load feedback");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    const markHandled = async (id) => {
        try {
            await updateFeedback(id, { status: "handled" });
            setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: "handled" } : i)));
        } catch (error) {
            console.error("Failed to update feedback:", error);
            toast.error("Failed to update");
        }
    };

    if (loading) return <p className="text-gray-400">Loading...</p>;
    if (items.length === 0) return <p className="text-gray-400">No feedback yet.</p>;

    return (
        <div className="space-y-3">
            {items.map((item) => (
                <div
                    key={item.id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start justify-between gap-4"
                >
                    <div className="space-y-2 min-w-0">
                        <p className="text-sm text-white whitespace-pre-wrap break-words">
                            {item.message}
                        </p>
                        <p className="text-xs text-gray-500">
                            {item.userEmail || "Anonymous"} · {item.page} ·{" "}
                            {item.createdAt?.toDate?.().toLocaleString() ?? ""}
                        </p>
                    </div>
                    {item.status === "new" ? (
                        <button
                            onClick={() => markHandled(item.id)}
                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-bold"
                        >
                            <Check size={14} /> Handled
                        </button>
                    ) : (
                        <span className="shrink-0 text-xs text-green-500 font-bold">Handled</span>
                    )}
                </div>
            ))}
        </div>
    );
}
