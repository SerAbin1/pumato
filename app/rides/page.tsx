"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    Bike,
    CalendarClock,
    CheckCircle2,
    Clock,
    Crosshair,
    Loader2,
    MapPin,
    Navigation,
    ShieldCheck,
    Users,
    X,
    Zap,
} from "lucide-react";
import type { User } from "firebase/auth";
import { useUserAuth } from "@/app/context/UserAuthContext";
import {
    cancelRideRequest,
    createRideRequest,
    fetchRidesSettings,
    subscribeMyScheduledRides,
    subscribeRideAvailability,
    widenRideRequest,
} from "@/lib/repositories";
import { MAX_PASSENGERS, PHONE_PATTERN } from "@/lib/schemas/rides";
import {
    activePlaces,
    bookableDates,
    DEFAULT_RIDE_SCHEDULE,
    formatDateOption,
    formatFare,
    formatRideTime,
    passengersLabel,
    pickupAccuracyLabel,
    routeFare,
    scheduleProblem,
    scheduledRideStatus,
    scheduledTime,
} from "@/lib/rides";
import { istInstant } from "@/lib/ist";
import CustomSelect from "@/app/components/CustomSelect";
import ConfirmModal from "@/app/components/ConfirmModal";
import { inputClass, labelClass, primaryButton, secondaryButton } from "./styles";
import AuthCard from "./components/AuthCard";
import RidesShell, { mainColumn, sideColumn, Steps } from "./components/RidesShell";
import type {
    PickupLocation,
    RideFares,
    RidePlace,
    RidePreference,
    RideRequest,
    RidesAvailability,
    RideSchedule,
} from "@/lib/types";

const GUEST_KEY = "pumato_rides_guest";

type Mode = "now" | "schedule";

interface Booking {
    id: string;
    pickupName: string;
    dropName: string;
    fare: number | null;
    passengers: number;
    phone: string;
    preference: RidePreference;
    scheduledFor: Date | null;
}

/** The current time, ticking so the bookable slots stay current. */
function useNow(intervalMs = 60_000) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
    const option = (value: Mode, icon: ReactNode, title: string, subtitle: string) => (
        <button
            type="button"
            aria-pressed={mode === value}
            onClick={() => onChange(value)}
            className={`flex-1 rounded-2xl border px-3 py-3 text-center transition-all ${mode === value ? "bg-orange-500/10 border-orange-500 text-white" : "bg-black/30 border-white/10 text-gray-400 hover:text-white"}`}
        >
            <span className="flex items-center justify-center gap-2 font-black">
                {icon} {title}
            </span>
            <span className="block text-xs text-gray-500 mt-0.5">{subtitle}</span>
        </button>
    );
    return (
        <div className="flex gap-2">
            {option("now", <Zap size={18} />, "Ride now", "Get a ride immediately")}
            {option("schedule", <CalendarClock size={18} />, "Schedule", "Book for a later time")}
        </div>
    );
}

/** Optional exact pin for a ride now, so the rider can find a guest away from the named spot. */
function PickupPin({
    pin,
    placeChosen,
    onChange,
}: {
    pin: PickupLocation | null;
    placeChosen: boolean;
    onChange: (pin: PickupLocation | null) => void;
}) {
    const [locating, setLocating] = useState(false);

    const locate = () => {
        if (!("geolocation" in navigator)) {
            toast.error("Your browser can't share its location.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setLocating(false);
                onChange({
                    // ~10 cm; more digits only make the link longer.
                    lat: Number(coords.latitude.toFixed(6)),
                    lng: Number(coords.longitude.toFixed(6)),
                    accuracy: Math.max(1, Math.round(coords.accuracy)),
                });
            },
            (error) => {
                setLocating(false);
                toast.error(
                    error.code === error.PERMISSION_DENIED
                        ? "Location is blocked. Allow it in your browser, or just pick the pickup."
                        : "Couldn't find your location. Please try again."
                );
            },
            { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }
        );
    };

    if (pin) {
        return (
            <div className="mt-2 space-y-1">
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                    <Crosshair size={14} /> Exact location added (
                    {pickupAccuracyLabel(pin.accuracy)})
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        aria-label="Remove exact location"
                        className="ml-auto text-gray-400 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </p>
                {/* The pin helps the rider find them; the fare still comes from a named place. */}
                {!placeChosen && (
                    <p className="text-xs text-orange-300">
                        Also pick the nearest place above, so we can work out the fare.
                    </p>
                )}
            </div>
        );
    }
    return (
        <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="mt-2 flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 disabled:opacity-60"
        >
            {locating ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
            {locating ? "Finding you…" : "Share my exact location (optional)"}
        </button>
    );
}

/** "Send to all riders" for a female-preference request; hides once sent. */
function WidenButton({ requestId, onWidened }: { requestId: string; onWidened?: () => void }) {
    const [busy, setBusy] = useState(false);
    const widen = async () => {
        setBusy(true);
        try {
            await widenRideRequest(requestId);
            toast.success("Sent to all riders");
            onWidened?.();
        } catch (error) {
            console.error("Failed to widen ride request:", error);
            toast.error("Couldn't send to all riders. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <button onClick={widen} disabled={busy} className={secondaryButton}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
            Send to all riders
        </button>
    );
}

function BookedCard({
    booking,
    schedule,
    onReset,
}: {
    booking: Booking;
    schedule: RideSchedule;
    onReset: () => void;
}) {
    const [widened, setWidened] = useState(false);
    const femaleOnly = booking.preference === "female" && !widened;
    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4">
            <CheckCircle2 size={48} className="text-green-400 mx-auto" />
            <h2 className="text-xl font-black">
                {booking.scheduledFor ? "Ride scheduled" : "Ride requested"}
            </h2>
            <p className="text-gray-400 text-sm">
                {booking.pickupName} → {booking.dropName}
                {booking.fare !== null && <> · {formatFare(booking.fare)}</>}
                {passengersLabel(booking.passengers) && (
                    <> · {passengersLabel(booking.passengers)}</>
                )}
                <br />
                {booking.scheduledFor ? (
                    <>
                        {formatRideTime(booking.scheduledFor)}. A rider can accept it any time
                        before; we&apos;ll ask them to confirm {schedule.reminderMinutes} min
                        before. Follow it under Your scheduled rides.
                    </>
                ) : (
                    <>A rider will call you on {booking.phone} shortly.</>
                )}
            </p>
            {femaleOnly && (
                <div className="space-y-3 text-sm text-pink-200 bg-pink-500/10 border border-pink-500/30 rounded-2xl p-4">
                    <p>
                        {booking.scheduledFor
                            ? "Only female riders were notified. Check back to see if one accepted; removing the preference makes it more likely a rider takes it."
                            : "Only female riders were notified. It may be faster with all riders."}
                    </p>
                    <WidenButton requestId={booking.id} onWidened={() => setWidened(true)} />
                </div>
            )}
            <button onClick={onReset} className={secondaryButton}>
                Book another ride
            </button>
        </div>
    );
}

/** The signed-in user's scheduled rides, with where each stands. */
function MyScheduledRides({ user, now }: { user: User; now: Date }) {
    const [rides, setRides] = useState<RideRequest[]>([]);
    const [cancelling, setCancelling] = useState<RideRequest | null>(null);

    useEffect(
        () =>
            subscribeMyScheduledRides(user.uid, setRides, (error) => {
                console.error("Failed to load scheduled rides:", error);
                toast.error("Couldn't load your scheduled rides. Please refresh.");
            }),
        [user.uid]
    );

    const cancel = async (ride: RideRequest) => {
        try {
            await cancelRideRequest(ride.id);
            toast.success("Ride cancelled");
        } catch (error) {
            console.error("Failed to cancel ride:", error);
            toast.error("Couldn't cancel the ride. Please try again.");
        }
    };

    if (rides.length === 0) return null;
    return (
        <section className={`${sideColumn} space-y-3`}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Your scheduled rides
            </h2>
            {rides.map((r) => {
                const at = scheduledTime(r);
                const open = r.status === "pending" || r.status === "accepted";
                return (
                    <div
                        key={r.id}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3"
                    >
                        <div className="space-y-0.5 text-sm">
                            <p className="font-bold text-white">
                                {r.pickupName} → {r.dropName}
                                {r.fare !== null && (
                                    <span className="text-orange-400"> · {formatFare(r.fare)}</span>
                                )}
                            </p>
                            {at && <p className="text-gray-400">{formatRideTime(at)}</p>}
                            <p className={open ? "text-orange-300" : "text-gray-500"}>
                                {scheduledRideStatus(r)}
                                {r.riderPreference === "female" && r.status === "pending" && (
                                    <> · female riders only</>
                                )}
                            </p>
                        </div>
                        {r.status === "pending" && r.riderPreference === "female" && (
                            <>
                                <p className="text-xs text-gray-500">
                                    Removing the preference makes it more likely a rider takes it.
                                </p>
                                <WidenButton requestId={r.id} />
                            </>
                        )}
                        {open && at && at > now && (
                            <button
                                onClick={() => setCancelling(r)}
                                className="w-full text-sm text-gray-400 hover:text-red-400"
                            >
                                Cancel ride
                            </button>
                        )}
                    </div>
                );
            })}
            <ConfirmModal
                isOpen={cancelling !== null}
                onClose={() => setCancelling(null)}
                onConfirm={() => cancelling && void cancel(cancelling)}
                title="Cancel this ride?"
                message={
                    cancelling?.status === "accepted"
                        ? "Your rider will be told it's cancelled."
                        : "No rider will be sent."
                }
                confirmLabel="Cancel ride"
                cancelLabel="Keep it"
            />
        </section>
    );
}

export default function RidesPage() {
    const { user } = useUserAuth();
    const now = useNow();
    const [places, setPlaces] = useState<RidePlace[] | null>(null);
    const [fares, setFares] = useState<RideFares>({});
    const [schedule, setSchedule] = useState(DEFAULT_RIDE_SCHEDULE);
    const [availability, setAvailability] = useState<RidesAvailability | null>(null);
    const [mode, setMode] = useState<Mode>("now");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [pickupId, setPickupId] = useState("");
    const [dropId, setDropId] = useState("");
    const [passengers, setPassengers] = useState(1);
    const [pin, setPin] = useState<PickupLocation | null>(null);
    const [dateKey, setDateKey] = useState("");
    const [time, setTime] = useState("");
    const [preferFemale, setPreferFemale] = useState(false);
    const [noFemaleRider, setNoFemaleRider] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);

    useEffect(() => {
        fetchRidesSettings()
            .then((s) => {
                setPlaces(activePlaces(s.places));
                setFares(s.fares);
                setSchedule(s.schedule);
            })
            .catch((error) => {
                console.error("Failed to load places:", error);
                toast.error("Couldn't load places. Please refresh.");
                setPlaces([]);
            });
        try {
            const saved = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "null");
            if (saved) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setName(saved.name ?? "");
                setPhone(saved.phone ?? "");
            }
        } catch {
            // Storage unavailable (private mode): the guest just types their details.
        }
        return subscribeRideAvailability(setAvailability);
    }, []);

    const byId = useMemo(() => new Map(places?.map((p) => [p.id, p])), [places]);
    const pickup = byId.get(pickupId);
    const drop = byId.get(dropId);
    const fare = pickup && drop ? routeFare(fares, pickup.id, drop.id) : null;

    const dates = bookableDates(now, schedule);
    const typedFor = dateKey && time ? istInstant(dateKey, time) : null;
    // Rechecked as the clock ticks, so a time that slips inside the lead stops counting.
    const timeProblem = typedFor && scheduleProblem(typedFor, now, schedule);
    const scheduledFor = typedFor && !timeProblem ? typedFor : null;
    const scheduling = mode === "schedule";
    const needsSignIn = scheduling && !user;

    const canSubmit =
        !!pickup &&
        !!drop &&
        pickupId !== dropId &&
        !!name.trim() &&
        PHONE_PATTERN.test(phone) &&
        (!scheduling || (!!user && !!scheduledFor)) &&
        // Wait to know whether a female rider is available before booking with the preference.
        (!preferFemale || availability !== null);

    const book = async (preference: RidePreference) => {
        if (!pickup || !drop || !canSubmit) return;
        setSubmitting(true);
        try {
            const id = await createRideRequest({
                name: name.trim(),
                phone,
                pickupId: pickup.id,
                pickupName: pickup.name,
                dropId: drop.id,
                dropName: drop.name,
                fare,
                passengers,
                ...(!scheduling && pin && { pickupLocation: pin }),
                riderPreference: preference,
                ...(scheduling && user && scheduledFor && { userId: user.uid, scheduledFor }),
            });
            try {
                localStorage.setItem(GUEST_KEY, JSON.stringify({ name: name.trim(), phone }));
            } catch {
                // Not remembering the guest is fine.
            }
            setBooking({
                id,
                pickupName: pickup.name,
                dropName: drop.name,
                fare,
                passengers,
                phone,
                preference,
                scheduledFor: scheduling ? scheduledFor : null,
            });
        } catch (error) {
            console.error("Failed to book ride:", error);
            toast.error("Couldn't book the ride. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        // A ride now needs a female rider online; a scheduled one, any approved female rider.
        const femaleAvailable = scheduling
            ? availability?.femaleApproved
            : availability?.femaleOnline;
        if (preferFemale && !femaleAvailable) {
            setNoFemaleRider(true);
            return;
        }
        void book(preferFemale ? "female" : "any");
    };

    const reset = () => {
        setBooking(null);
        setPickupId("");
        setDropId("");
        setPassengers(1);
        setPin(null);
        setDateKey("");
        setTime("");
    };

    let content;
    if (booking) {
        content = <BookedCard booking={booking} schedule={schedule} onReset={reset} />;
    } else if (places === null) {
        content = (
            <div className="flex justify-center py-12">
                <Loader2 size={28} className="animate-spin text-gray-500" />
            </div>
        );
    } else if (places.length < 2) {
        content = (
            <p className="text-center text-gray-400 bg-white/5 border border-white/10 rounded-3xl p-8">
                Rides aren&apos;t available yet. Check back soon!
            </p>
        );
    } else {
        content = (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
                <ModeToggle mode={mode} onChange={setMode} />
                {needsSignIn ? (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">
                            Sign in to schedule a ride, so you can check on it and cancel it.
                        </p>
                        <AuthCard />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <p className={labelClass}>
                                <MapPin size={12} className="inline mr-1" /> Pickup
                            </p>
                            <CustomSelect
                                options={places.map((p) => ({ value: p.id, label: p.name }))}
                                value={pickupId}
                                onChange={(id) => {
                                    setPickupId(id);
                                    // The drop list hides the pickup, so a matching drop is gone.
                                    if (id === dropId) setDropId("");
                                }}
                                placeholder="Where are you?"
                            />
                            {!scheduling && (
                                <PickupPin pin={pin} placeChosen={!!pickup} onChange={setPin} />
                            )}
                        </div>
                        <div>
                            <p className={labelClass}>
                                <Navigation size={12} className="inline mr-1" /> Drop
                            </p>
                            <CustomSelect
                                options={places
                                    .filter((p) => p.id !== pickupId)
                                    .map((p) => ({ value: p.id, label: p.name }))}
                                value={dropId}
                                onChange={setDropId}
                                placeholder="Where to?"
                            />
                        </div>
                        <div>
                            <p className={labelClass}>
                                <Users size={12} className="inline mr-1" /> Passengers
                            </p>
                            <div className="flex gap-2">
                                {Array.from({ length: MAX_PASSENGERS }, (_, i) => i + 1).map(
                                    (n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            aria-pressed={passengers === n}
                                            onClick={() => setPassengers(n)}
                                            className={`flex-1 rounded-xl border py-2.5 font-black transition-all ${passengers === n ? "bg-orange-500/10 border-orange-500 text-white" : "bg-black/30 border-white/10 text-gray-400 hover:text-white"}`}
                                        >
                                            {n}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                        {scheduling && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className={labelClass}>
                                        <CalendarClock size={12} className="inline mr-1" /> Date
                                    </p>
                                    <CustomSelect
                                        options={dates.map((d) => ({
                                            value: d,
                                            label: formatDateOption(d, now),
                                        }))}
                                        value={dateKey}
                                        onChange={setDateKey}
                                        placeholder="Select date"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="time" className={labelClass}>
                                        <Clock size={12} className="inline mr-1" /> Pickup time
                                    </label>
                                    <input
                                        id="time"
                                        type="time"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        aria-invalid={!!timeProblem}
                                        aria-describedby={timeProblem ? "time-problem" : undefined}
                                        className={`${inputClass} [color-scheme:dark]`}
                                        required
                                    />
                                </div>
                                {timeProblem && (
                                    <p
                                        id="time-problem"
                                        className="col-span-2 text-sm text-orange-300 ml-1"
                                    >
                                        {timeProblem}
                                    </p>
                                )}
                            </div>
                        )}
                        {pickup && drop && (
                            <p className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-3 text-sm">
                                <span className="text-gray-400">Fare</span>
                                {fare === null ? (
                                    <span className="text-gray-400">Confirmed by rider</span>
                                ) : (
                                    <span className="font-black text-white">
                                        {formatFare(fare)}
                                    </span>
                                )}
                            </p>
                        )}
                        <button
                            type="button"
                            role="switch"
                            aria-checked={preferFemale}
                            onClick={() => setPreferFemale(!preferFemale)}
                            className="w-full flex items-center gap-3 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-left"
                        >
                            <ShieldCheck size={20} className="text-orange-400 shrink-0" />
                            <span className="flex-1 min-w-0">
                                <span className="block text-sm font-bold text-white">
                                    Prefer a female rider
                                </span>
                                <span className="block text-xs text-gray-500">
                                    Optional. Only female riders are notified.
                                </span>
                            </span>
                            <span
                                className={`w-11 h-6 shrink-0 rounded-full p-0.5 transition-all ${preferFemale ? "bg-orange-600" : "bg-white/15"}`}
                            >
                                <span
                                    className={`block w-5 h-5 rounded-full bg-white transition-all ${preferFemale ? "translate-x-5" : ""}`}
                                />
                            </span>
                        </button>
                        <div>
                            <label htmlFor="name" className={labelClass}>
                                Your name
                            </label>
                            <input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                maxLength={80}
                                className={inputClass}
                                placeholder="Name"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className={labelClass}>
                                Phone
                            </label>
                            <input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                value={phone}
                                onChange={(e) =>
                                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                                }
                                className={inputClass}
                                placeholder="10-digit number"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!canSubmit || submitting}
                            className={primaryButton}
                        >
                            {submitting ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : scheduling ? (
                                <CalendarClock size={20} />
                            ) : (
                                <Bike size={20} />
                            )}
                            {scheduling ? "Schedule ride" : "Book ride"}
                        </button>
                    </form>
                )}
            </div>
        );
    }

    return (
        <RidesShell title="Pumato Rides" subtitle="Anywhere on campus, now or later.">
            <div className={mainColumn}>{content}</div>

            <Steps
                title="How it works"
                steps={[
                    "Pick where you are and where you're going.",
                    `Ride now, or schedule one up to ${schedule.maxDaysAhead} days ahead (sign in to schedule).`,
                    "Riders are notified; the first to accept gets your ride and calls you.",
                    "For a scheduled ride, your rider confirms shortly before. If they don't, we find you another.",
                ]}
                footer={
                    <p className="text-sm text-gray-500">
                        Got a bike?{" "}
                        <Link href="/rides/register" className="text-orange-400 font-bold">
                            Become a rider →
                        </Link>
                    </p>
                }
            />

            {user && <MyScheduledRides user={user} now={now} />}

            <ConfirmModal
                isOpen={noFemaleRider}
                onClose={() => setNoFemaleRider(false)}
                onConfirm={() => {
                    setPreferFemale(false);
                    void book("any");
                }}
                title="No female riders available"
                message={
                    scheduling
                        ? "There are no female riders to take scheduled rides right now. Remove the preference to send it to all riders, or try again later."
                        : "No female riders are online right now. Remove the preference to send your request to all riders, or try again later."
                }
                confirmLabel="Remove female preference"
                cancelLabel="Wait, try again later"
                isDanger={false}
            />
        </RidesShell>
    );
}
