"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { collection, onSnapshot, orderBy, query, Timestamp, where } from "firebase/firestore";
import { ArrowLeft, Bike, Loader2, LogOut, Power } from "lucide-react";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { useFcmToken } from "@/app/hooks/useFcmToken";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";
import { fetchRider, setRiderOnline } from "@/lib/repositories";
import type { User } from "firebase/auth";
import type { RideRequest, Rider } from "@/lib/types";
import AuthCard from "../components/AuthCard";
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

/** Today's pending requests, oldest first, while the rider is online. */
function PendingRequests() {
    const [requests, setRequests] = useState<RideRequest[] | null>(null);

    useEffect(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        return onSnapshot(
            query(
                collection(db, COLLECTIONS.RIDE_REQUESTS),
                where("status", "==", "pending"),
                where("createdAt", ">=", Timestamp.fromDate(todayStart)),
                orderBy("createdAt", "asc")
            ),
            (snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RideRequest)),
            (error) => {
                console.error("Failed to load ride requests:", error);
                toast.error("Couldn't load ride requests. Please refresh.");
            }
        );
    }, []);

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
                <div key={r.id} className="bg-black/30 border border-white/5 rounded-xl p-4">
                    <p className="font-bold text-white">
                        {r.pickupName} → {r.dropName}
                    </p>
                    <p className="text-xs text-gray-500">
                        {r.createdAt?.toDate?.().toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                        }) ?? ""}
                    </p>
                </div>
            ))}
        </div>
    );
}

function Dashboard({ user, rider }: { user: User; rider: Rider }) {
    const [online, setOnline] = useState(rider.online === true);
    const [busy, setBusy] = useState(false);
    useFcmToken(user);

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
        <div className="space-y-4">
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
                    {busy ? <Loader2 size={20} className="animate-spin" /> : <Power size={20} />}
                    {online ? "Go offline" : "Go online"}
                </button>
            </div>

            {online && (
                <div className={cardClass}>
                    <h2 className="font-black">Ride requests</h2>
                    <PendingRequests />
                </div>
            )}
        </div>
    );
}

export default function RiderDashboardPage() {
    const { user, loading, logout } = useUserAuth();
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

    let content;
    if (loading || (user && rider === undefined)) {
        content = (
            <div className="flex justify-center py-12">
                <Loader2 size={28} className="animate-spin text-gray-500" />
            </div>
        );
    } else if (!user) {
        content = <AuthCard />;
    } else if (rider && rider.status === "approved" && isRiderClaim) {
        content = <Dashboard user={user} rider={rider} />;
    } else {
        const copy = NOT_A_RIDER[rider?.status ?? "none"] ?? NOT_A_RIDER.none;
        content = (
            <div className={`${cardClass} text-center`}>
                <h2 className="text-xl font-black">{copy.title}</h2>
                <p className="text-sm text-gray-400">{copy.body}</p>
                <Link href="/rides/register" className={primaryButton}>
                    {copy.cta}
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-between mb-8">
                    <Link
                        href="/rides"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                    >
                        <ArrowLeft size={16} /> Pumato Rides
                    </Link>
                    {user && (
                        <button
                            onClick={logout}
                            className="inline-flex items-center gap-1 text-gray-400 hover:text-red-400 text-sm font-medium transition-colors"
                        >
                            <LogOut size={14} /> Logout
                        </button>
                    )}
                </div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Bike size={32} className="text-orange-400" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">Rider dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Pumato Rides</p>
                </div>

                {content}
            </div>
        </div>
    );
}
