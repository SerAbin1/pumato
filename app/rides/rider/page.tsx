"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    BellOff,
    BellRing,
    CalendarClock,
    Check,
    CheckCheck,
    History,
    Loader2,
    MapPin,
    Phone,
    Power,
    Star,
    Undo2,
    Users,
} from "lucide-react";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { useFcmToken } from "@/app/hooks/useFcmToken";
import {
    averageRating,
    DEFAULT_RIDE_SCHEDULE,
    formatFare,
    formatRideTime,
    isDueSoon,
    occupiesRider,
    passengersLabel,
    pickupAccuracyLabel,
    pickupMapsUrl,
    scheduledTime,
} from "@/lib/rides";
import {
    addLocalRide,
    addSyncedRides,
    completedRidesKey,
    EMPTY_COMPLETED_RIDES,
    formatWeek,
    parseCompletedRides,
    toCompletedRide,
    weeklyEarnings,
} from "@/lib/riderRides";
import {
    acceptRide,
    completeRide,
    confirmRide,
    fetchRiderCompletedRides,
    fetchRidesSettings,
    releaseRide,
    RIDE_TAKEN,
    setRiderOnline,
    subscribeRider,
    subscribePendingRides,
    subscribeRiderRides,
    subscribeUpcomingRides,
} from "@/lib/repositories";
import type { ReactNode } from "react";
import type { FirebaseError } from "firebase/app";
import type { Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";
import type {
    CompletedRide,
    CompletedRidesCache,
    RidePreference,
    RideRequest,
    Rider,
    RideSchedule,
} from "@/lib/types";
import AuthCard from "../components/AuthCard";
import RidesShell, { mainColumn, sideColumn, Steps } from "../components/RidesShell";
import { cardClass, primaryButton, secondaryButton } from "../styles";

const NOT_A_RIDER: Record<string, { title: string; body: string; cta: string }> = {
    none: {
        title: "You're not a rider yet",
        body: "Apply to become a Pumato rider to start getting ride requests.",
        cta: "Apply to ride",
    },
    pending: {
        title: "Application under review",
        body: "We'll verify your details soon. You can check or edit your application.",
        cta: "View my application",
    },
    rejected: {
        title: "Application not approved",
        body: "Check your details and apply again.",
        cta: "Apply again",
    },
    revoked: {
        title: "Rider access removed",
        body: "Please contact the Pumato team.",
        cta: "View my application",
    },
};

const formatRequested = (r: RideRequest) =>
    r.createdAt?.toDate?.().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) ?? "";

const formatClock = (at: Date) => at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const rowClass = "bg-black/30 border border-white/5 rounded-xl p-4 space-y-3";
const smallButton =
    "flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-40 transition-all";
const badgeClass = "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold";

type RidesSubscription = (
    onChange: (rides: RideRequest[]) => void,
    onError: (error: Error) => void
) => Unsubscribe;

/** Live rides from a repository subscription; pass a memoised one so it subscribes once. */
function useRides(subscribe: RidesSubscription) {
    const [rides, setRides] = useState<RideRequest[] | null>(null);
    useEffect(
        () =>
            subscribe(setRides, (error) => {
                console.error("Failed to load ride requests:", error);
                toast.error("Couldn't load ride requests. Please refresh.");
            }),
        [subscribe]
    );
    return rides;
}

/** The current time, ticking so scheduled rides move into "due" without a refresh. */
function useNow(intervalMs = 30_000) {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

/**
 * The rider's completed rides: the browser's copy at once, then only the rides
 * completed since it was saved. Null until the copy is read.
 */
function useCompletedRides(uid: string) {
    const [cache, setCache] = useState<CompletedRidesCache | null>(null);

    const update = useCallback(
        (change: (cache: CompletedRidesCache) => CompletedRidesCache) =>
            setCache((prev) => {
                const next = change(prev ?? EMPTY_COMPLETED_RIDES);
                try {
                    localStorage.setItem(completedRidesKey(uid), JSON.stringify(next));
                } catch {
                    // Not saving it only costs a fuller fetch next visit.
                }
                return next;
            }),
        [uid]
    );

    useEffect(() => {
        let saved = EMPTY_COMPLETED_RIDES;
        try {
            saved = parseCompletedRides(localStorage.getItem(completedRidesKey(uid)));
        } catch {
            // Storage unavailable: fetch the latest rides instead.
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCache(saved);
        let stale = false;
        fetchRiderCompletedRides(uid, saved.syncedTo)
            .then((rides) => {
                if (stale) return;
                // A completed ride always carries completedAt.
                const fetched = rides.map((r) =>
                    toCompletedRide({ ...r, completedAt: r.completedAt })
                );
                update((c) => addSyncedRides(c, fetched));
            })
            .catch((error) => console.error("Failed to load completed rides:", error));
        return () => {
            stale = true;
        };
    }, [uid, update]);

    /** Counts a ride the rider just completed, without fetching it. */
    const addCompleted = useCallback(
        (ride: RideRequest) =>
            update((c) =>
                addLocalRide(
                    c,
                    toCompletedRide({ ...ride, completedAt: { toDate: () => new Date() } })
                )
            ),
        [update]
    );

    return { rides: cache?.rides ?? null, addCompleted };
}

/** Route, fare, and for a scheduled or female-preference ride, a badge saying so. */
function RideSummary({ ride, detail }: { ride: RideRequest; detail?: ReactNode }) {
    const at = scheduledTime(ride);
    const passengers = passengersLabel(ride.passengers);
    return (
        <div className="space-y-1">
            <p className="font-bold text-white">
                {ride.pickupName} → {ride.dropName}
                {ride.fare !== null && (
                    <span className="text-orange-400"> · {formatFare(ride.fare)}</span>
                )}
            </p>
            {(at || passengers || ride.riderPreference === "female") && (
                <div className="flex flex-wrap gap-1">
                    {passengers && (
                        <span className={`${badgeClass} bg-white/10 text-gray-200`}>
                            <Users size={12} /> {passengers}
                        </span>
                    )}
                    {at && (
                        <span className={`${badgeClass} bg-sky-500/15 text-sky-300`}>
                            <CalendarClock size={12} /> {formatRideTime(at)}
                        </span>
                    )}
                    {ride.riderPreference === "female" && (
                        <span className={`${badgeClass} bg-pink-500/15 text-pink-300`}>
                            Female rider requested
                        </span>
                    )}
                </div>
            )}
            {detail && <p className="text-sm text-gray-400">{detail}</p>}
        </div>
    );
}

/** Rides this rider accepted and hasn't finished: shows the guest's contact. */
function MyRides({
    rides,
    schedule,
    onCompleted,
}: {
    rides: RideRequest[] | null;
    schedule: RideSchedule;
    onCompleted: (ride: RideRequest) => void;
}) {
    const [busy, setBusy] = useState<string | null>(null);

    const act = async (
        id: string,
        action: (id: string) => Promise<void>,
        failure: string,
        onDone?: () => void
    ) => {
        setBusy(id);
        try {
            await action(id);
            onDone?.();
        } catch (error) {
            console.error(failure, error);
            toast.error(`${failure} Please try again.`);
        } finally {
            setBusy(null);
        }
    };

    if (!rides?.length) return null;
    // Rides now first, then scheduled rides soonest first.
    const sorted = [...rides].sort(
        (a, b) => (scheduledTime(a)?.getTime() ?? 0) - (scheduledTime(b)?.getTime() ?? 0)
    );
    return (
        <div className={cardClass}>
            <h2 className="font-black">Your rides</h2>
            {sorted.map((r) => {
                const asked = r.confirmRequestedAt?.toDate?.() as Date | undefined;
                const needsConfirm = !!asked && !r.riderConfirmedAt;
                return (
                    <div key={r.id} className={rowClass}>
                        <RideSummary
                            ride={r}
                            detail={
                                <>
                                    {r.name} · requested {formatRequested(r)}
                                    {r.riderConfirmedAt && (
                                        <span className="text-green-400"> · Confirmed</span>
                                    )}
                                </>
                            }
                        />
                        {needsConfirm && (
                            <div className="space-y-2">
                                <p className="text-sm text-orange-300">
                                    Confirm by{" "}
                                    {formatClock(
                                        new Date(asked.getTime() + schedule.confirmMinutes * 60_000)
                                    )}{" "}
                                    or this ride goes to other riders.
                                </p>
                                <button
                                    onClick={() =>
                                        act(r.id, confirmRide, "Couldn't confirm the ride.")
                                    }
                                    disabled={busy === r.id}
                                    className={primaryButton}
                                >
                                    <CheckCheck size={20} /> Confirm ride
                                </button>
                            </div>
                        )}
                        <a
                            href={`tel:${r.phone}`}
                            className={needsConfirm ? secondaryButton : primaryButton}
                        >
                            <Phone size={18} /> Call {r.phone}
                        </a>
                        {r.pickupLocation && (
                            <a
                                href={pickupMapsUrl(r.pickupLocation)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={secondaryButton}
                            >
                                <MapPin size={18} /> Open pickup pin (
                                {pickupAccuracyLabel(r.pickupLocation.accuracy)})
                            </a>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() =>
                                    act(r.id, completeRide, "Couldn't complete the ride.", () =>
                                        onCompleted(r)
                                    )
                                }
                                disabled={busy === r.id}
                                className={`${smallButton} bg-green-600 hover:bg-green-500 text-white`}
                            >
                                <Check size={16} /> Complete
                            </button>
                            <button
                                onClick={() => act(r.id, releaseRide, "Couldn't release the ride.")}
                                disabled={busy === r.id}
                                className={`${smallButton} bg-white/10 hover:bg-white/15 text-gray-300`}
                            >
                                <Undo2 size={16} /> Release
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Pending requests while the rider is online: rides now plus scheduled rides
 * that are due, oldest first, then scheduled rides they can claim ahead.
 */
function PendingRequests({
    rider,
    hasActiveRide,
    schedule,
    now,
}: {
    rider: Rider;
    // null while the rider's own rides are still loading
    hasActiveRide: boolean | null;
    schedule: RideSchedule;
    now: Date;
}) {
    // Female riders also see female-preference requests; the rules refuse anything wider.
    const preferences = useMemo<RidePreference[]>(
        () => (rider.gender === "female" ? ["any", "female"] : ["any"]),
        [rider.gender]
    );
    const rideNow = useRides(
        useCallback<RidesSubscription>(
            (onChange, onError) => subscribePendingRides(preferences, onChange, onError),
            [preferences]
        )
    );
    const upcoming = useRides(
        useCallback<RidesSubscription>(
            (onChange, onError) => subscribeUpcomingRides(preferences, onChange, onError),
            [preferences]
        )
    );
    const [accepting, setAccepting] = useState<string | null>(null);

    const accept = async (ride: RideRequest) => {
        setAccepting(ride.id);
        try {
            await acceptRide(ride.id, { uid: rider.uid, name: rider.name });
            const at = scheduledTime(ride);
            toast.success(
                at && !isDueSoon(at, new Date(), schedule)
                    ? `Ride accepted. We'll ask you to confirm ${schedule.reminderMinutes} min before.`
                    : "Ride accepted. Call the guest now."
            );
        } catch (error) {
            // Once another rider has it, the request is no longer readable to us.
            const taken =
                (error as Error).message === RIDE_TAKEN ||
                (error as FirebaseError).code === "permission-denied";
            if (!taken) console.error("Failed to accept ride:", error);
            toast.error(
                taken ? "Someone else just took this ride." : "Couldn't accept. Please try again."
            );
        } finally {
            setAccepting(null);
        }
    };

    if (rideNow === null || upcoming === null) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-500" />
            </div>
        );
    }

    const isDue = (r: RideRequest) => isDueSoon(scheduledTime(r)!, now, schedule);
    const requests = [...upcoming.filter(isDue), ...rideNow];
    const later = upcoming.filter((r) => !isDue(r));

    const row = (r: RideRequest, blocked: boolean) => (
        <div key={r.id} className={rowClass}>
            <RideSummary ride={r} detail={scheduledTime(r) ? null : formatRequested(r)} />
            <button
                onClick={() => accept(r)}
                disabled={accepting !== null || blocked}
                className={primaryButton}
            >
                {accepting === r.id ? (
                    <Loader2 size={20} className="animate-spin" />
                ) : (
                    <Check size={20} />
                )}
                Accept
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                {requests.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-8">
                        No ride requests right now. We&apos;ll notify you when one comes in.
                    </p>
                ) : (
                    <>
                        {hasActiveRide && (
                            <p className="text-center text-sm text-orange-300">
                                Complete or release your current ride to accept another.
                            </p>
                        )}
                        {requests.map((r) => row(r, hasActiveRide !== false))}
                    </>
                )}
            </div>
            {later.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Scheduled
                    </h3>
                    <p className="text-xs text-gray-500">
                        Claim one ahead; we&apos;ll ask you to confirm {schedule.reminderMinutes}{" "}
                        min before it starts.
                    </p>
                    {later.map((r) => row(r, false))}
                </div>
            )}
        </div>
    );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
    return (
        <div className="bg-black/30 border border-white/5 rounded-xl p-4">
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </div>
    );
}

/** This week's earnings from the cached completed rides, and the full history behind them. */
function Earnings({
    rides,
    rider,
    now,
}: {
    rides: CompletedRide[] | null;
    rider: Rider;
    now: Date;
}) {
    const [showHistory, setShowHistory] = useState(false);
    if (rides === null) return null;
    const { total, count, unpriced } = weeklyEarnings(rides, now);
    const rating = averageRating(rider);
    const ratings = rider.ratingCount ?? 0;
    return (
        <div className={cardClass}>
            <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-black">This week</h2>
                <p className="text-xs text-gray-500">{formatWeek(now)}</p>
            </div>
            {/* Earnings are this week's; the rating is all time. */}
            <div className="grid grid-cols-3 gap-3">
                <Stat
                    value={<span className="text-orange-400">{formatFare(total)}</span>}
                    label="Earned"
                />
                <Stat value={count} label="Completed rides" />
                <Stat
                    value={
                        rating === null ? (
                            "–"
                        ) : (
                            <span className="inline-flex items-center gap-1">
                                <Star size={18} className="fill-orange-400 text-orange-400" />
                                {rating}
                            </span>
                        )
                    }
                    label={
                        ratings === 0
                            ? "No ratings yet"
                            : `${ratings} rating${ratings === 1 ? "" : "s"}, all time`
                    }
                />
            </div>
            {unpriced > 0 && (
                <p className="text-xs text-gray-500">
                    {unpriced === 1 ? "1 ride" : `${unpriced} rides`} on routes without a set fare
                    {unpriced === 1 ? " isn't" : " aren't"} in the total.
                </p>
            )}
            <button onClick={() => setShowHistory(!showHistory)} className={secondaryButton}>
                <History size={18} /> {showHistory ? "Hide history" : "View history"}
            </button>
            {showHistory &&
                (rides.length === 0 ? (
                    <p className="text-center text-sm text-gray-500">No completed rides yet.</p>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {rides.map((r) => (
                            <div
                                key={r.id}
                                className="bg-black/30 border border-white/5 rounded-xl p-3 text-sm"
                            >
                                <p className="font-bold text-white">
                                    {r.pickupName} → {r.dropName}
                                    {r.fare !== null && (
                                        <span className="text-orange-400">
                                            {" "}
                                            · {formatFare(r.fare)}
                                        </span>
                                    )}
                                </p>
                                <p className="text-gray-500">
                                    {r.guestName} · {formatRideTime(new Date(r.completedAt))}
                                </p>
                            </div>
                        ))}
                    </div>
                ))}
        </div>
    );
}

/** iPhones only allow web push for sites added to the home screen and opened from there. */
const needsHomeScreen = () => {
    const ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        // iPadOS reports itself as a Mac.
        (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
    return ios && !window.matchMedia("(display-mode: standalone)").matches;
};

/** Tells the rider when they won't get ride notifications, and how to fix it. */
function NotificationNotice({
    permission,
    request,
}: {
    permission: NotificationPermission | "unsupported" | null;
    request: () => Promise<void>;
}) {
    const [homeScreen] = useState(needsHomeScreen);

    let message: ReactNode = null;
    if (homeScreen) {
        message = (
            <>
                To get ride notifications on iPhone, tap <b>Share</b> → <b>Add to Home Screen</b>,
                then open Pumato from your home screen.
            </>
        );
    } else if (permission === "unsupported") {
        message = "This browser can't show notifications. Keep this page open to see new requests.";
    } else if (permission === "denied") {
        message =
            "Notifications are blocked, so you'll miss new requests. Allow them for this site in your browser settings.";
    } else if (permission === "default") {
        message = (
            <>
                Turn on notifications to hear about new ride requests.
                <button
                    onClick={() => void request()}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold"
                >
                    <BellRing size={16} /> Turn on notifications
                </button>
            </>
        );
    }

    if (!message) return null;
    return (
        <div className="flex gap-3 text-sm text-orange-200 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
            <BellOff size={18} className="shrink-0 text-orange-400 mt-0.5" />
            <div className="min-w-0 flex-1">{message}</div>
        </div>
    );
}

function Dashboard({ user, rider }: { user: User; rider: Rider }) {
    // From the live rider doc, so it also follows a switch made on another device.
    const online = rider.online === true;
    const [busy, setBusy] = useState(false);
    const { permission, request } = useFcmToken(user);
    const completed = useCompletedRides(user.uid);
    const [schedule, setSchedule] = useState(DEFAULT_RIDE_SCHEDULE);
    const now = useNow();
    const myRides = useRides(
        useCallback<RidesSubscription>(
            (onChange, onError) => subscribeRiderRides(user.uid, onChange, onError),
            [user.uid]
        )
    );
    // A rider takes one ride at a time; unknown until their rides load.
    const hasActiveRide =
        myRides === null ? null : myRides.some((r) => occupiesRider(r, now, schedule));

    useEffect(() => {
        fetchRidesSettings()
            .then((s) => setSchedule(s.schedule))
            .catch((error) => console.error("Failed to load rides settings:", error));
    }, []);

    const toggleOnline = async () => {
        setBusy(true);
        try {
            await setRiderOnline(user.uid, !online);
        } catch (error) {
            console.error("Failed to change online status:", error);
            toast.error("Couldn't change your status. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <div className={`${sideColumn} space-y-4`}>
                <NotificationNotice permission={permission} request={request} />
                <div className={cardClass}>
                    <div className="flex items-center gap-3">
                        <span
                            className={`w-3 h-3 rounded-full ${online ? "bg-green-400" : "bg-gray-600"}`}
                        />
                        <div>
                            <h2 className="font-black">
                                {online ? "You're online" : "You're offline"}
                            </h2>
                            <p className="text-xs text-gray-500">
                                {online
                                    ? "You'll be notified of new ride requests."
                                    : "Go online to start getting ride requests."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={toggleOnline}
                        disabled={busy}
                        className={online ? secondaryButton : primaryButton}
                    >
                        {busy ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Power size={20} />
                        )}
                        {online ? "Go offline" : "Go online"}
                    </button>
                </div>

                <MyRides rides={myRides} schedule={schedule} onCompleted={completed.addCompleted} />
                <Earnings rides={completed.rides} rider={rider} now={now} />
            </div>

            <div className={`${mainColumn} ${cardClass}`}>
                <h2 className="font-black">Ride requests</h2>
                {online ? (
                    <PendingRequests
                        rider={rider}
                        hasActiveRide={hasActiveRide}
                        schedule={schedule}
                        now={now}
                    />
                ) : (
                    <p className="text-center text-sm text-gray-500 py-8">
                        Go online to see ride requests.
                    </p>
                )}
            </div>
        </>
    );
}

export default function RiderDashboardPage() {
    const { user, loading } = useUserAuth();
    // undefined = still loading; null = hasn't applied
    const [rider, setRider] = useState<Rider | null | undefined>(undefined);
    // undefined = still checking
    const [isRiderClaim, setIsRiderClaim] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRider(undefined);
        setIsRiderClaim(undefined);
        if (!user) return;
        let stale = false;
        // Force-refresh so a freshly approved (or revoked) rider sees it.
        user.getIdTokenResult(true)
            .then((token) => !stale && setIsRiderClaim(token.claims.rider === true))
            .catch((error) => {
                console.error("Failed to check rider access:", error);
                toast.error("Couldn't load your rider profile. Please refresh.");
            });
        // Live, so a new rating or an online switch elsewhere shows without a reload.
        const unsubscribe = subscribeRider(user.uid, setRider, (error) => {
            console.error("Failed to load rider:", error);
            toast.error("Couldn't load your rider profile. Please refresh.");
        });
        return () => {
            stale = true;
            unsubscribe();
        };
    }, [user]);

    const isLoading = loading || (user && (rider === undefined || isRiderClaim === undefined));
    const showDashboard = !isLoading && user && rider?.status === "approved" && isRiderClaim;

    let content;
    if (isLoading) {
        content = (
            <div className={`${mainColumn} flex justify-center py-12`}>
                <Loader2 size={28} className="animate-spin text-gray-500" />
            </div>
        );
    } else if (!user) {
        content = (
            <div className={mainColumn}>
                <AuthCard />
            </div>
        );
    } else if (showDashboard && rider) {
        content = <Dashboard user={user} rider={rider} />;
    } else {
        const copy = NOT_A_RIDER[rider?.status ?? "none"] ?? NOT_A_RIDER.none;
        content = (
            <div className={`${mainColumn} ${cardClass} text-center`}>
                <h2 className="text-xl font-black">{copy.title}</h2>
                <p className="text-sm text-gray-400">{copy.body}</p>
                <Link href="/rides/register" className={primaryButton}>
                    {copy.cta}
                </Link>
            </div>
        );
    }

    return (
        <RidesShell title="Rider dashboard" subtitle="Pumato Rides">
            {content}
            {/* The dashboard fills both columns itself; other states explain riding. */}
            {!showDashboard && (
                <Steps
                    title="How riding works"
                    steps={[
                        "Go online whenever you're free to give rides.",
                        "You'll be notified of every new ride request, and of rides booked ahead.",
                        "The first rider to accept gets it, along with the guest's number.",
                        "For a scheduled ride, confirm when we ask, shortly before it starts.",
                        "Call the guest, give the ride, then mark it complete.",
                    ]}
                />
            )}
        </RidesShell>
    );
}
