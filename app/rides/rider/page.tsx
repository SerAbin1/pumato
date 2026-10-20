"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { BellOff, BellRing, Check, Loader2, Phone, Power, Undo2 } from "lucide-react";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { useFcmToken } from "@/app/hooks/useFcmToken";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import {
    acceptRide,
    completeRide,
    fetchRider,
    releaseRide,
    RIDE_TAKEN,
    setRiderOnline,
} from "@/lib/repositories";
import type { ReactNode } from "react";
import type { FirebaseError } from "firebase/app";
import type { Query } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { RideRequest, Rider } from "@/lib/types";
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

const formatTime = (r: RideRequest) =>
    r.createdAt?.toDate?.().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) ?? "";

const rowClass = "bg-black/30 border border-white/5 rounded-xl p-4 space-y-3";
const smallButton =
    "flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-40 transition-all";

/** Live ride requests for `q`; pass a memoised query so it subscribes once. */
function useRideRequests(q: Query) {
    const [requests, setRequests] = useState<RideRequest[] | null>(null);

    useEffect(
        () =>
            onSnapshot(
                q,
                (snap) =>
                    setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RideRequest)),
                (error) => {
                    console.error("Failed to load ride requests:", error);
                    toast.error("Couldn't load ride requests. Please refresh.");
                }
            ),
        [q]
    );
    return requests;
}

/** Rides this rider accepted and hasn't finished: shows the guest's contact. */
function MyRides({ uid }: { uid: string }) {
    const rides = useRideRequests(
        useMemo(
            () =>
                query(
                    collection(db, COLLECTIONS.RIDE_REQUESTS),
                    where("riderUid", "==", uid),
                    where("status", "==", "accepted")
                ),
            [uid]
        )
    );
    const [busy, setBusy] = useState<string | null>(null);

    const act = async (id: string, action: (id: string) => Promise<void>, failure: string) => {
        setBusy(id);
        try {
            await action(id);
        } catch (error) {
            console.error(failure, error);
            toast.error(`${failure} Please try again.`);
        } finally {
            setBusy(null);
        }
    };

    if (!rides?.length) return null;
    return (
        <div className={cardClass}>
            <h2 className="font-black">Your rides</h2>
            {rides.map((r) => (
                <div key={r.id} className={rowClass}>
                    <div>
                        <p className="font-bold text-white">
                            {r.pickupName} → {r.dropName}
                        </p>
                        <p className="text-sm text-gray-400">
                            {r.name} · requested {formatTime(r)}
                        </p>
                    </div>
                    <a href={`tel:${r.phone}`} className={primaryButton}>
                        <Phone size={18} /> Call {r.phone}
                    </a>
                    <div className="flex gap-2">
                        <button
                            onClick={() => act(r.id, completeRide, "Couldn't complete the ride.")}
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
            ))}
        </div>
    );
}

const pendingToday = () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return query(
        collection(db, COLLECTIONS.RIDE_REQUESTS),
        where("status", "==", "pending"),
        where("createdAt", ">=", Timestamp.fromDate(todayStart)),
        orderBy("createdAt", "asc")
    );
};

/** Today's pending requests, oldest first, while the rider is online. */
function PendingRequests({ rider }: { rider: Rider }) {
    const [pendingQuery] = useState(pendingToday);
    const requests = useRideRequests(pendingQuery);
    const [accepting, setAccepting] = useState<string | null>(null);

    const accept = async (id: string) => {
        setAccepting(id);
        try {
            await acceptRide(id, { uid: rider.uid, name: rider.name });
            toast.success("Ride accepted. Call the guest now.");
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

    if (requests === null) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-500" />
            </div>
        );
    }
    if (requests.length === 0) {
        return (
            <p className="text-center text-sm text-gray-500 py-8">
                No ride requests right now. We&apos;ll notify you when one comes in.
            </p>
        );
    }
    return (
        <div className="space-y-2">
            {requests.map((r) => (
                <div key={r.id} className={rowClass}>
                    <div>
                        <p className="font-bold text-white">
                            {r.pickupName} → {r.dropName}
                        </p>
                        <p className="text-xs text-gray-500">{formatTime(r)}</p>
                    </div>
                    <button
                        onClick={() => accept(r.id)}
                        disabled={accepting !== null}
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
    const [online, setOnline] = useState(rider.online === true);
    const [busy, setBusy] = useState(false);
    const { permission, request } = useFcmToken(user);

    const toggleOnline = async () => {
        setBusy(true);
        try {
            await setRiderOnline(user.uid, !online);
            setOnline(!online);
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

                <MyRides uid={user.uid} />
            </div>

            <div className={`${mainColumn} ${cardClass}`}>
                <h2 className="font-black">Ride requests</h2>
                {online ? (
                    <PendingRequests rider={rider} />
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
    const [isRiderClaim, setIsRiderClaim] = useState(false);

    const load = useCallback(async (signedIn: User) => {
        try {
            const [r, token] = await Promise.all([
                fetchRider(signedIn.uid),
                // Force-refresh so a freshly approved (or revoked) rider sees it.
                signedIn.getIdTokenResult(true),
            ]);
            setRider(r);
            setIsRiderClaim(token.claims.rider === true);
        } catch (error) {
            console.error("Failed to load rider:", error);
            toast.error("Couldn't load your rider profile. Please refresh.");
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRider(undefined);
        setIsRiderClaim(false);
        if (user) void load(user);
    }, [user, load]);

    const isLoading = loading || (user && rider === undefined);
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
                        "You'll be notified of every new ride request.",
                        "The first rider to accept gets it, along with the guest's number.",
                        "Call the guest, give the ride, then mark it complete.",
                    ]}
                />
            )}
        </RidesShell>
    );
}
