"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
    Bike,
    CalendarClock,
    CheckCircle2,
    Clock,
    Crosshair,
    GraduationCap,
    Hourglass,
    Loader2,
    MapPin,
    Navigation,
    Phone,
    ShieldCheck,
    Star,
    TrendingUp,
    Users,
    X,
    Zap,
} from "lucide-react";
import type { User } from "firebase/auth";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { useCart } from "@/app/context/CartContext";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import {
    cancelRideRequest,
    confirmRideByUser,
    createRideRequest,
    EMPTY_RIDES_STATS,
    fetchRidesSettings,
    joinRideWaitlist,
    leaveRideWaitlist,
    offerHigherFare,
    rateRide,
    subscribeMyRides,
    subscribeRideAvailability,
    subscribeRideStats,
    subscribeWaitlistEntry,
    widenRideRequest,
} from "@/lib/repositories";
import { MAX_PASSENGERS, MAX_RATING, PHONE_PATTERN } from "@/lib/schemas/rides";
import {
    activePlaces,
    bookableDates,
    dropPlaces,
    DEFAULT_RIDE_SCHEDULE,
    FARE_OFFER_STEPS,
    formatDateOption,
    formatFare,
    formatRideTime,
    isOpenRide,
    isPilotClaim,
    isWaitlistedCampus,
    passengersLabel,
    pickupAccuracyLabel,
    placesForCampus,
    rideStatus,
    rideTime,
    routeFare,
    scheduleProblem,
    scheduledTime,
    secondsToConfirm,
    splitMyRides,
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
    RidesStats,
    RideSchedule,
    RideWaitlistEntry,
} from "@/lib/types";

/** Remembered on this device only, so the next booking starts filled in. */
const CONTACT_KEY = "pumato_rides_contact";
const LEGACY_CONTACT_KEY = "pumato_rides_guest";

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

/** Public counters, so anyone can see how many riders and rides Pumato has. */
function StatsBand({ stats }: { stats: RidesStats }) {
    const numbers = [
        {
            icon: <Bike size={16} />,
            value: stats.totalRiders,
            label: "Pilots",
        },
        {
            icon: <Zap size={16} />,
            value: stats.onlineRiders,
            label: "Online now",
        },
        {
            icon: <CheckCircle2 size={16} />,
            value: stats.completedRides,
            label: "Rides done",
        },
    ];
    return (
        <section aria-label="Pumato Rides numbers" className="grid grid-cols-3 gap-2">
            {numbers.map(({ icon, value, label }) => (
                <div
                    key={label}
                    className="bg-white/5 border border-white/10 rounded-2xl px-3 py-4 text-center"
                >
                    <span className="flex items-center justify-center gap-1.5 text-orange-400">
                        {icon}
                        <span className="text-2xl font-black text-white">
                            {value.toLocaleString("en-IN")}
                        </span>
                    </span>
                    <span className="block text-[11px] uppercase tracking-widest text-gray-500 mt-1">
                        {label}
                    </span>
                </div>
            ))}
        </section>
    );
}

/** Campus buttons, shown wherever the user can still change where they're riding. */
function CampusPicker({
    campus,
    placesAvailable,
    onPick,
}: {
    campus: string | undefined;
    placesAvailable: boolean;
    onPick: (campusId: string) => void;
}) {
    return (
        <div>
            <p className={labelClass}>
                <GraduationCap size={12} className="inline mr-1" /> Campus
            </p>
            <div className="flex gap-2">
                {DEFAULT_CAMPUS_CONFIG.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => onPick(c.id)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                            campus === c.id
                                ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                        }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>
            {!placesAvailable && (
                <p className="text-xs text-gray-500 mt-2">
                    {campus
                        ? "Rides aren't available on this campus yet."
                        : "Pick your campus to see places."}
                </p>
            )}
        </div>
    );
}

/** Optional exact pin for a ride now, so the rider can find the user away from the named spot. */
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

/** "Send to all pilots" for a female-preference request; hides once sent. */
function WidenButton({ requestId, onWidened }: { requestId: string; onWidened?: () => void }) {
    const [busy, setBusy] = useState(false);
    const widen = async () => {
        setBusy(true);
        try {
            await widenRideRequest(requestId);
            toast.success("Sent to all pilots");
            onWidened?.();
        } catch (error) {
            console.error("Failed to widen ride request:", error);
            toast.error("Couldn't send to all pilots. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <button onClick={widen} disabled={busy} className={secondaryButton}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
            Send to all pilots
        </button>
    );
}

/** ₹5/₹10/₹15 bumps for a request nobody has taken yet; riders are notified each time. */
function FareOffers({
    requestId,
    fare,
    onRaised,
}: {
    requestId: string;
    fare: number | null;
    onRaised?: (fare: number) => void;
}) {
    const [raising, setRaising] = useState<number | null>(null);

    const raise = async (increment: number) => {
        setRaising(increment);
        try {
            const raised = await offerHigherFare(requestId, increment);
            onRaised?.(raised);
            toast.success(`Fare raised to ${formatFare(raised)}`);
        } catch (error) {
            console.error("Failed to raise fare:", error);
            toast.error("Couldn't raise the fare. Please try again.");
        } finally {
            setRaising(null);
        }
    };

    if (fare === null) return null;
    return (
        <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                <TrendingUp size={14} className="text-orange-400" /> Offer a higher fare to get a
                pilot faster
            </p>
            <div className="flex gap-2">
                {FARE_OFFER_STEPS.map((step) => (
                    <button
                        key={step}
                        type="button"
                        onClick={() => void raise(step)}
                        disabled={raising !== null}
                        className="flex-1 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 disabled:opacity-50 py-2 text-sm font-black text-orange-300"
                    >
                        {raising === step ? (
                            <Loader2 size={16} className="animate-spin mx-auto" />
                        ) : (
                            `+₹${step}`
                        )}
                    </button>
                ))}
            </div>
        </div>
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
    const [fare, setFare] = useState(booking.fare);
    const femaleOnly = booking.preference === "female" && !widened;
    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4">
            <CheckCircle2 size={48} className="text-green-400 mx-auto" />
            <h2 className="text-xl font-black">
                {booking.scheduledFor ? "Ride scheduled" : "Ride requested"}
            </h2>
            <p className="text-gray-400 text-sm">
                {booking.pickupName} → {booking.dropName}
                {fare !== null && <> · {formatFare(fare)}</>}
                {passengersLabel(booking.passengers) && (
                    <> · {passengersLabel(booking.passengers)}</>
                )}
                <br />
                {booking.scheduledFor ? (
                    <>
                        {formatRideTime(booking.scheduledFor)}. A pilot can accept it any time
                        before; we&apos;ll ask them to confirm {schedule.reminderMinutes} min
                        before. Follow it under Your rides.
                    </>
                ) : (
                    <>A pilot will call you on {booking.phone} shortly.</>
                )}
            </p>
            {!booking.scheduledFor && (
                <FareOffers requestId={booking.id} fare={fare} onRaised={setFare} />
            )}
            {femaleOnly && (
                <div className="space-y-3 text-sm text-pink-200 bg-pink-500/10 border border-pink-500/30 rounded-2xl p-4">
                    <p>
                        {booking.scheduledFor
                            ? "Only female pilots were notified. Check back to see if one accepted; removing the preference makes it more likely a pilot takes it."
                            : "Only female pilots were notified. It may be faster with all pilots."}
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

const rideCard = "bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3";
const cancelButton = "w-full text-sm text-gray-400 hover:text-red-400";
const groupHeading = "text-xs font-bold text-gray-400 uppercase tracking-widest";

function RideRoute({
    ride,
}: {
    ride: { pickupName: string; dropName: string; fare: number | null };
}) {
    return (
        <p className="font-bold text-white">
            {ride.pickupName} → {ride.dropName}
            {ride.fare !== null && (
                <span className="text-orange-400"> · {formatFare(ride.fare)}</span>
            )}
        </p>
    );
}

/** Stars for the rider of a completed ride; tapping one saves it, once. */
function RatePilot({ ride }: { ride: RideRequest }) {
    const [saving, setSaving] = useState<number | null>(null);

    const rate = async (stars: number) => {
        setSaving(stars);
        try {
            await rateRide(ride.id, stars);
            toast.success("Thanks for rating your pilot!");
        } catch (error) {
            console.error("Failed to rate ride:", error);
            toast.error("Couldn't save your rating. Please try again.");
        } finally {
            setSaving(null);
        }
    };

    const shown = ride.rating ?? saving ?? 0;
    return (
        <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-gray-400">
                {ride.rating ? "You rated" : "Rate"} {ride.riderName}
            </span>
            <div className="flex">
                {Array.from({ length: MAX_RATING }, (_, i) => i + 1).map((n) => (
                    <button
                        key={n}
                        onClick={() => void rate(n)}
                        disabled={!!ride.rating || saving !== null}
                        aria-label={`${n} of ${MAX_RATING} stars`}
                        className="p-1 disabled:cursor-default"
                    >
                        <Star
                            size={18}
                            className={
                                n <= shown ? "fill-orange-400 text-orange-400" : "text-gray-600"
                            }
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Who accepted, with the number masked and the rating snapshotted on accept. The
 * user has a minute to cancel before the ride confirms itself.
 */
function PilotAssigned({
    ride,
    now,
    onCancel,
}: {
    ride: RideRequest;
    now: Date;
    onCancel?: (ride: RideRequest) => void;
}) {
    const [confirming, setConfirming] = useState(false);
    const secondsLeft = secondsToConfirm(ride, now);
    const awaiting = secondsLeft !== null;
    const confirmed = !!ride.userConfirmedAt;

    const confirm = async () => {
        setConfirming(true);
        try {
            await confirmRideByUser(ride.id);
            toast.success("Ride confirmed");
        } catch (error) {
            console.error("Failed to confirm ride:", error);
            toast.error("Couldn't confirm the ride. Please try again.");
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
            <p className="font-bold text-emerald-200">{ride.riderName} is on the way</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-300">
                {ride.riderRating !== undefined && (
                    <span className="flex items-center gap-1">
                        <Star size={14} className="fill-orange-400 text-orange-400" />
                        {ride.riderRating}
                        {ride.riderRatingCount ? (
                            <span className="text-gray-500">({ride.riderRatingCount})</span>
                        ) : null}
                    </span>
                )}
                {ride.riderPhoneMasked && (
                    <span className="flex items-center gap-1">
                        <Phone size={14} /> {ride.riderPhoneMasked}
                    </span>
                )}
                {ride.fare !== null && (
                    <span className="font-bold text-white">{formatFare(ride.fare)}</span>
                )}
            </p>
            {awaiting ? (
                <div className="space-y-2 pt-1">
                    <p className="text-xs text-gray-400">
                        Confirm within {secondsLeft}s, or the ride confirms itself.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => void confirm()}
                            disabled={confirming}
                            className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2 text-xs font-black"
                        >
                            {confirming ? (
                                <Loader2 size={14} className="animate-spin mx-auto" />
                            ) : (
                                "Confirm ride"
                            )}
                        </button>
                        {onCancel && (
                            <button
                                onClick={() => onCancel(ride)}
                                className="flex-1 rounded-lg bg-white/10 hover:bg-white/15 py-2 text-xs font-bold text-gray-300"
                            >
                                Cancel ride
                            </button>
                        )}
                    </div>
                </div>
            ) : confirmed ? (
                <p className="text-xs text-emerald-300">Ride confirmed</p>
            ) : (
                <p className="text-xs text-gray-400">Confirming your ride…</p>
            )}
        </div>
    );
}

function MyRideCard({
    ride,
    now,
    onCancel,
}: {
    ride: RideRequest;
    now: Date;
    onCancel?: (ride: RideRequest) => void;
}) {
    const at = scheduledTime(ride);
    const open = isOpenRide(ride, now);
    // A scheduled ride can be cancelled until its time; a ride now while it's under way.
    const cancellable = open && (!at || at > now);
    const awaiting = ride.status === "accepted" && secondsToConfirm(ride, now) !== null;
    return (
        <div className={rideCard}>
            <div className={`space-y-0.5 text-sm ${open ? "" : "opacity-60"}`}>
                <RideRoute ride={ride} />
                <p className="text-gray-400">
                    {at ? formatRideTime(at) : `Booked ${formatRideTime(rideTime(ride, now))}`}
                </p>
                <p className={open ? "text-orange-300" : "text-gray-500"}>
                    {rideStatus(ride, now)}
                    {open && ride.riderPreference === "female" && ride.status === "pending" && (
                        <> · female pilots only</>
                    )}
                </p>
            </div>
            {open && ride.status === "pending" && (
                <FareOffers requestId={ride.id} fare={ride.fare} />
            )}
            {open && ride.status === "pending" && ride.riderPreference === "female" && (
                <>
                    <p className="text-xs text-gray-500">
                        Removing the preference makes it more likely a pilot takes it.
                    </p>
                    <WidenButton requestId={ride.id} />
                </>
            )}
            {ride.status === "accepted" && ride.riderName && (
                <PilotAssigned ride={ride} now={now} onCancel={onCancel} />
            )}
            {ride.status === "completed" && ride.riderName && <RatePilot ride={ride} />}
            {cancellable && onCancel && !awaiting && (
                <button onClick={() => onCancel(ride)} className={cancelButton}>
                    Cancel ride
                </button>
            )}
        </div>
    );
}

/** The signed-in user's rides, ride now or scheduled: the ones under way, then past ones. */
function MyRides({ user, now }: { user: User; now: Date }) {
    const [rides, setRides] = useState<RideRequest[]>([]);
    const [cancelling, setCancelling] = useState<RideRequest | null>(null);

    useEffect(
        () =>
            subscribeMyRides(user.uid, setRides, (error) => {
                console.error("Failed to load rides:", error);
                toast.error("Couldn't load your rides. Please refresh.");
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
    const { current, past } = splitMyRides(rides, now);
    return (
        <section className={`${sideColumn} space-y-3`}>
            <h2 className="text-lg font-black">Your rides</h2>
            {current.length > 0 && <h3 className={groupHeading}>Current</h3>}
            {current.map((r) => (
                <MyRideCard key={r.id} ride={r} now={now} onCancel={setCancelling} />
            ))}
            {past.length > 0 && <h3 className={`${groupHeading} pt-2`}>Past</h3>}
            {past.map((r) => (
                <MyRideCard key={r.id} ride={r} now={now} />
            ))}
            <ConfirmModal
                isOpen={cancelling !== null}
                onClose={() => setCancelling(null)}
                onConfirm={() => cancelling && void cancel(cancelling)}
                title="Cancel this ride?"
                message={
                    cancelling?.status === "accepted"
                        ? "Your pilot will be told it's cancelled."
                        : "No pilot will be sent."
                }
                confirmLabel="Cancel ride"
                cancelLabel="Keep it"
            />
        </section>
    );
}

/**
 * PTU and PIMS take a waitlist instead of bookings, one sign-up per user, so
 * the count the admin sees is people rather than taps.
 */
function WaitlistCard({ campus, stats, user }: { campus: string; stats: RidesStats; user: User }) {
    const [entry, setEntry] = useState<RideWaitlistEntry | null>(null);
    const [busy, setBusy] = useState(false);
    const count = stats.waitlist[campus] ?? 0;
    const joined = entry?.campusId === campus;

    useEffect(
        () =>
            subscribeWaitlistEntry(user.uid, setEntry, (error) =>
                console.error("Failed to load waitlist sign-up:", error)
            ),
        [user.uid]
    );

    const toggle = async () => {
        setBusy(true);
        try {
            if (joined) {
                await leaveRideWaitlist(user.uid);
                toast.success("You left the waitlist");
            } else {
                await joinRideWaitlist(user.uid, campus);
                toast.success("You're on the waitlist");
            }
        } catch (error) {
            console.error("Failed to update waitlist:", error);
            toast.error("Couldn't update the waitlist. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4 text-center">
            <Hourglass size={44} className="text-orange-400 mx-auto" />
            <h2 className="text-xl font-black">Rides are coming to {campus}</h2>
            <p className="text-sm text-gray-400">
                We&apos;re not taking bookings here yet. Join the waitlist and we&apos;ll let you
                know as soon as pilots are ready.
            </p>
            <p className="text-sm text-gray-300">
                {count === 0
                    ? "Be the first to sign up."
                    : `${count} ${count === 1 ? "person is" : "people are"} already waiting.`}
            </p>
            <button
                onClick={() => void toggle()}
                disabled={busy}
                className={joined ? secondaryButton : primaryButton}
            >
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Hourglass size={20} />}
                {joined ? "Leave the waitlist" : "Join the waitlist"}
            </button>
            {joined && (
                <p className="text-xs text-emerald-300">
                    You&apos;re on the list. We&apos;ll be in touch.
                </p>
            )}
            {entry && !joined && (
                <p className="text-xs text-gray-500">
                    Joining here moves your sign-up from {entry.campusId}.
                </p>
            )}
        </div>
    );
}

export default function RidesPage() {
    const { user } = useUserAuth();
    const router = useRouter();
    const { userDetails, setUserDetails } = useCart();
    const now = useNow();
    const [stats, setStats] = useState<RidesStats>(EMPTY_RIDES_STATS);
    const [allPlaces, setAllPlaces] = useState<RidePlace[] | null>(null);
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
    const [noFemalePilot, setNoFemalePilot] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [booking, setBooking] = useState<Booking | null>(null);

    // Pilots belong on their dashboard, not the booking form.
    useEffect(() => {
        if (!user) return;
        let stale = false;
        // Force-refresh so a freshly approved pilot is redirected too.
        user.getIdTokenResult(true)
            .then((token) => {
                if (!stale && isPilotClaim(token.claims)) router.replace("/rides/pilot");
            })
            .catch((error) => console.error("Failed to check pilot access:", error));
        return () => {
            stale = true;
        };
    }, [user, router]);

    useEffect(() => {
        fetchRidesSettings()
            .then((s) => {
                setAllPlaces(activePlaces(s.places));
                setFares(s.fares);
                setSchedule(s.schedule);
            })
            .catch((error) => {
                console.error("Failed to load places:", error);
                toast.error("Couldn't load places. Please refresh.");
                setAllPlaces([]);
            });
        try {
            const saved = JSON.parse(
                localStorage.getItem(CONTACT_KEY) ??
                    localStorage.getItem(LEGACY_CONTACT_KEY) ??
                    "null"
            );
            if (saved) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setName(saved.name ?? "");
                setPhone(saved.phone ?? "");
            }
        } catch {
            // Storage unavailable (private mode): the user just types their details.
        }
    }, []);

    useEffect(
        () =>
            subscribeRideStats(setStats, (error) => console.error("Failed to load stats:", error)),
        []
    );

    const campus = userDetails.campus;
    const waitlisted = isWaitlistedCampus(campus);
    useEffect(() => {
        if (!campus) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAvailability(null);
        return subscribeRideAvailability(campus, setAvailability);
    }, [campus]);
    const places = useMemo(
        () => allPlaces && placesForCampus(allPlaces, campus),
        [allPlaces, campus]
    );
    const byId = useMemo(() => new Map(places?.map((p) => [p.id, p])), [places]);
    const drops = useMemo(
        () => (allPlaces ? dropPlaces(allPlaces, campus, pickupId) : []),
        [allPlaces, campus, pickupId]
    );
    const pickup = byId.get(pickupId);
    const drop = byId.get(dropId);
    const fare = pickup && drop ? routeFare(fares, pickup.id, drop.id) : null;

    const dates = bookableDates(now, schedule);
    const typedFor = dateKey && time ? istInstant(dateKey, time) : null;
    // Rechecked as the clock ticks, so a time that slips inside the lead stops counting.
    const timeProblem = typedFor && scheduleProblem(typedFor, now, schedule);
    const scheduledFor = typedFor && !timeProblem ? typedFor : null;
    const scheduling = mode === "schedule";

    const canSubmit =
        !!user &&
        !!campus &&
        !waitlisted &&
        !!pickup &&
        !!drop &&
        pickupId !== dropId &&
        !!name.trim() &&
        PHONE_PATTERN.test(phone) &&
        (!scheduling || !!scheduledFor) &&
        // Wait to know whether a female rider is available before booking with the preference.
        (!preferFemale || availability !== null);

    const pickCampus = (campusId: string) => {
        if (campusId === campus) return;
        setUserDetails((prev) => ({ ...prev, campus: campusId }));
        // Places differ by campus, so a picked one may be gone.
        setPickupId("");
        setDropId("");
    };

    const book = async (preference: RidePreference) => {
        if (!user || !campus || !pickup || !drop || !canSubmit) return;
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
                campusId: campus,
                passengers,
                ...(!scheduling && pin && { pickupLocation: pin }),
                riderPreference: preference,
                userId: user.uid,
                ...(scheduling && scheduledFor && { scheduledFor }),
            });
            try {
                localStorage.setItem(CONTACT_KEY, JSON.stringify({ name: name.trim(), phone }));
            } catch {
                // Not remembering the contact is fine.
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
            setNoFemalePilot(true);
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
    } else if (!user) {
        content = (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                <h2 className="text-xl font-black">Sign in to book a ride</h2>
                <p className="text-sm text-gray-400">
                    Anyone can see our pilots and rides above. Booking needs a Pumato account, so
                    you can follow the ride, confirm your pilot and cancel if plans change.
                </p>
                <AuthCard />
            </div>
        );
    } else if (allPlaces === null || places === null) {
        content = (
            <div className="flex justify-center py-12">
                <Loader2 size={28} className="animate-spin text-gray-500" />
            </div>
        );
    } else if (waitlisted && campus) {
        content = (
            <div className="space-y-5">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <CampusPicker
                        campus={campus}
                        placesAvailable={places.length >= 2}
                        onPick={pickCampus}
                    />
                </div>
                <WaitlistCard campus={campus} stats={stats} user={user} />
            </div>
        );
    } else if (allPlaces.length < 2) {
        content = (
            <p className="text-center text-gray-400 bg-white/5 border border-white/10 rounded-3xl p-8">
                Rides aren&apos;t available yet. Check back soon!
            </p>
        );
    } else {
        content = (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
                <ModeToggle mode={mode} onChange={setMode} />
                <form onSubmit={handleSubmit} className="space-y-5">
                    <CampusPicker
                        campus={campus}
                        placesAvailable={places.length >= 2}
                        onPick={pickCampus}
                    />
                    <div>
                        <p className={labelClass}>
                            <MapPin size={12} className="inline mr-1" /> Pickup
                        </p>
                        <CustomSelect
                            options={places.map((p) => ({ value: p.id, label: p.name }))}
                            value={pickupId}
                            onChange={(id) => {
                                setPickupId(id);
                                // The drop list follows the pickup, so the drop may be gone.
                                if (
                                    allPlaces &&
                                    !dropPlaces(allPlaces, campus, id).some((p) => p.id === dropId)
                                ) {
                                    setDropId("");
                                }
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
                            options={drops.map((p) => ({ value: p.id, label: p.name }))}
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
                            {Array.from({ length: MAX_PASSENGERS }, (_, i) => i + 1).map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    aria-pressed={passengers === n}
                                    onClick={() => setPassengers(n)}
                                    className={`flex-1 rounded-xl border py-2.5 font-black transition-all ${passengers === n ? "bg-orange-500/10 border-orange-500 text-white" : "bg-black/30 border-white/10 text-gray-400 hover:text-white"}`}
                                >
                                    {n}
                                </button>
                            ))}
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
                                <span className="text-gray-400">Confirmed by pilot</span>
                            ) : (
                                <span className="font-black text-white">{formatFare(fare)}</span>
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
                                Prefer a female pilot
                            </span>
                            <span className="block text-xs text-gray-500">
                                Optional. Only female pilots are notified.
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
            </div>
        );
    }

    return (
        <RidesShell title="Pumato Rides" subtitle="Anywhere on campus, now or later.">
            <div className={`${mainColumn} space-y-4`}>
                <StatsBand stats={stats} />
                {content}
            </div>

            <Steps
                title="How it works"
                steps={[
                    "Sign in, then pick where you are and where you're going.",
                    `Ride now, or schedule one up to ${schedule.maxDaysAhead} days ahead.`,
                    "Pilots are notified; the first to accept gets your ride. Confirm them within a minute, or it confirms itself.",
                    "For a scheduled ride, your pilot confirms shortly before. If they don't, we find you another.",
                ]}
                footer={
                    <p className="text-sm text-gray-500">
                        Got a bike?{" "}
                        <Link href="/rides/register" className="text-orange-400 font-bold">
                            Become a pilot →
                        </Link>
                    </p>
                }
            />

            {user && <MyRides user={user} now={now} />}

            <ConfirmModal
                isOpen={noFemalePilot}
                onClose={() => setNoFemalePilot(false)}
                onConfirm={() => {
                    setPreferFemale(false);
                    void book("any");
                }}
                title="No female pilots available"
                message={
                    scheduling
                        ? "There are no female pilots to take scheduled rides right now. Remove the preference to send it to all pilots, or try again later."
                        : "No female pilots are online right now. Remove the preference to send your request to all pilots, or try again later."
                }
                confirmLabel="Remove female preference"
                cancelLabel="Wait, try again later"
                isDanger={false}
            />
        </RidesShell>
    );
}
