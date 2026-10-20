import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { collection, getDocs, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { fetchRidesSettings, saveRidesSettings } from "@/lib/repositories";
import { manageUsers } from "@/lib/functions";
import { riderRef } from "@/lib/rides";
import toast from "react-hot-toast";
import { Check, Loader2, Phone, Plus, Save, Trash2, X } from "lucide-react";
import type { RideRequest, Rider, RiderStatus, RidesSettings } from "@/lib/types";

const inputClass =
    "w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 outline-none focus:border-orange-500/50";
const sectionClass = "bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4";

const RIDER_ACTIONS: Partial<
    Record<RiderStatus, { action: string; label: string; className: string }[]>
> = {
    pending: [
        { action: "APPROVE_RIDER", label: "Approve", className: "bg-green-600" },
        { action: "REJECT_RIDER", label: "Reject", className: "bg-red-600" },
    ],
    approved: [{ action: "REVOKE_RIDER", label: "Revoke", className: "bg-red-600" }],
};

function SettingsSection() {
    const [settings, setSettings] = useState<RidesSettings | null>(null);
    const [newPlace, setNewPlace] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchRidesSettings()
            .then(setSettings)
            .catch((error) => {
                console.error("Failed to load rides settings:", error);
                toast.error("Failed to load rides settings");
            });
    }, []);

    if (!settings) return <p className="text-gray-400">Loading...</p>;

    const update = (patch: Partial<RidesSettings>) => setSettings({ ...settings, ...patch });
    const updatePlace = (id: string, patch: Partial<RidesSettings["places"][number]>) =>
        update({ places: settings.places.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

    const addPlace = () => {
        const name = newPlace.trim();
        if (!name) return;
        update({
            places: [
                ...settings.places,
                { id: crypto.randomUUID().slice(0, 8), name, active: true },
            ],
        });
        setNewPlace("");
    };

    const save = async () => {
        setSaving(true);
        try {
            await saveRidesSettings(settings);
            toast.success("Rides settings saved");
        } catch (error) {
            console.error("Failed to save rides settings:", error);
            toast.error("Failed to save. Check every place has a name.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={sectionClass}>
            <h2 className="text-lg font-black">Settings</h2>
            <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs text-gray-400 space-y-1">
                    <span>Verification WhatsApp number</span>
                    <input
                        value={settings.whatsappNumber}
                        onChange={(e) => update({ whatsappNumber: e.target.value })}
                        placeholder="919048086503"
                        className={inputClass}
                    />
                </label>
                <label className="text-xs text-gray-400 space-y-1">
                    <span>Verification Telegram username</span>
                    <input
                        value={settings.telegramUsername}
                        onChange={(e) => update({ telegramUsername: e.target.value })}
                        placeholder="@pumato"
                        className={inputClass}
                    />
                </label>
            </div>

            <div className="space-y-2">
                <p className="text-xs text-gray-400">
                    Campus places (pickup & drop). Hide a place instead of deleting it if past
                    requests use it.
                </p>
                {settings.places.map((place) => (
                    <div key={place.id} className="flex items-center gap-2">
                        <input
                            value={place.name}
                            onChange={(e) => updatePlace(place.id, { name: e.target.value })}
                            aria-label="Place name"
                            className={inputClass}
                        />
                        <button
                            onClick={() => updatePlace(place.id, { active: !place.active })}
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold ${place.active ? "bg-green-600/20 text-green-400" : "bg-white/10 text-gray-500"}`}
                        >
                            {place.active ? "Shown" : "Hidden"}
                        </button>
                        <button
                            onClick={() =>
                                update({ places: settings.places.filter((p) => p.id !== place.id) })
                            }
                            aria-label={`Delete ${place.name}`}
                            className="shrink-0 p-2 rounded-xl text-gray-500 hover:text-red-400"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <input
                        value={newPlace}
                        onChange={(e) => setNewPlace(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addPlace()}
                        placeholder="Add a place, e.g. Main Gate"
                        aria-label="New place"
                        className={inputClass}
                    />
                    <button
                        onClick={addPlace}
                        aria-label="Add place"
                        className="shrink-0 p-2.5 rounded-xl bg-white/10 text-white"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-bold disabled:opacity-40"
            >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save settings
            </button>
        </section>
    );
}

function RidersSection() {
    const [riders, setRiders] = useState<Rider[] | null>(null);
    const [filter, setFilter] = useState<RiderStatus>("pending");
    const [busy, setBusy] = useState<string | null>(null);

    const fetchRiders = useCallback(async () => {
        try {
            const snap = await getDocs(
                query(collection(db, COLLECTIONS.RIDERS), orderBy("createdAt", "desc"))
            );
            setRiders(snap.docs.map((d) => d.data() as Rider));
        } catch (error) {
            console.error("Failed to load riders:", error);
            toast.error("Failed to load riders");
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchRiders();
    }, [fetchRiders]);

    const act = async (uid: string, action: string, label: string) => {
        setBusy(uid);
        try {
            await manageUsers({ action, uid });
            toast.success(`${label}d`);
            await fetchRiders();
        } catch (error) {
            console.error(`Failed to ${label.toLowerCase()} rider:`, error);
            toast.error((error as Error).message || `Failed to ${label.toLowerCase()}`);
        } finally {
            setBusy(null);
        }
    };

    const shown = riders?.filter((r) => r.status === filter) ?? [];

    return (
        <section className={sectionClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-black">Riders</h2>
                <div className="flex gap-1 bg-black/30 p-1 rounded-xl">
                    {(["pending", "approved", "rejected", "revoked"] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${filter === s ? "bg-white/10 text-white" : "text-gray-500"}`}
                        >
                            {s} ({riders?.filter((r) => r.status === s).length ?? 0})
                        </button>
                    ))}
                </div>
            </div>

            {riders === null ? (
                <p className="text-gray-400">Loading...</p>
            ) : shown.length === 0 ? (
                <p className="text-gray-500 text-sm">No {filter} riders.</p>
            ) : (
                <div className="space-y-2">
                    {shown.map((rider) => (
                        <div
                            key={rider.uid}
                            className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                        >
                            <div className="min-w-0 text-sm space-y-0.5">
                                <p className="font-bold text-white">
                                    {rider.name}{" "}
                                    <span className="font-mono text-xs text-orange-400">
                                        {riderRef(rider.uid)}
                                    </span>
                                </p>
                                <p className="text-gray-400">
                                    <a href={`tel:${rider.phone}`} className="hover:text-white">
                                        {rider.phone}
                                    </a>{" "}
                                    · {rider.vehicleNumber} · ID {rider.collegeId}
                                </p>
                                <p className="text-xs text-gray-500">{rider.email}</p>
                            </div>
                            <div className="flex gap-2">
                                {RIDER_ACTIONS[rider.status]?.map(
                                    ({ action, label, className }) => (
                                        <button
                                            key={action}
                                            onClick={() => act(rider.uid, action, label)}
                                            disabled={busy === rider.uid}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-bold disabled:opacity-40 ${className}`}
                                        >
                                            {label === "Approve" ? (
                                                <Check size={14} />
                                            ) : (
                                                <X size={14} />
                                            )}
                                            {label}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function RideRequestsSection() {
    const [requests, setRequests] = useState<RideRequest[] | null>(null);

    useEffect(
        () =>
            onSnapshot(
                query(
                    collection(db, COLLECTIONS.RIDE_REQUESTS),
                    orderBy("createdAt", "desc"),
                    limit(50)
                ),
                (snap) =>
                    setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RideRequest)),
                (error) => {
                    console.error("Failed to load ride requests:", error);
                    toast.error("Failed to load ride requests");
                }
            ),
        []
    );

    return (
        <section className={sectionClass}>
            <h2 className="text-lg font-black">Ride requests</h2>
            <p className="text-xs text-gray-500">
                Latest 50, live. Dispatch by calling the guest until riders get a dashboard.
            </p>
            {requests === null ? (
                <p className="text-gray-400">Loading...</p>
            ) : requests.length === 0 ? (
                <p className="text-gray-500 text-sm">No ride requests yet.</p>
            ) : (
                <div className="space-y-2">
                    {requests.map((r) => (
                        <div
                            key={r.id}
                            className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                        >
                            <div className="min-w-0 text-sm space-y-0.5">
                                <p className="font-bold text-white">
                                    {r.pickupName} → {r.dropName}
                                </p>
                                <p className="text-gray-400">
                                    {r.name} · {r.createdAt?.toDate?.().toLocaleString() ?? ""}
                                </p>
                            </div>
                            <a
                                href={`tel:${r.phone}`}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-bold"
                            >
                                <Phone size={14} /> {r.phone}
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default function RidesTab() {
    return (
        <div className="space-y-6">
            <RideRequestsSection />
            <RidersSection />
            <SettingsSection />
        </div>
    );
}
