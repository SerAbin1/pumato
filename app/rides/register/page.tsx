"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Bike, CheckCircle2, Clock, Loader2, Send, XCircle } from "lucide-react";
import { useUserAuth } from "@/app/context/UserAuthContext";
import { useCart } from "@/app/context/CartContext";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import { fetchRider, fetchRidesSettings, submitRiderApplication } from "@/lib/repositories";
import type { RiderApplication } from "@/lib/repositories";
import { PHONE_PATTERN, RIDER_GENDERS } from "@/lib/schemas/rides";
import { riderRef, riderVerificationMessage, telegramUrl, whatsappUrl } from "@/lib/rides";
import type { User } from "firebase/auth";
import type { Rider, RidesSettings } from "@/lib/types";
import AuthCard from "../components/AuthCard";
import RidesShell, { mainColumn, Steps } from "../components/RidesShell";
import { cardClass, inputClass, labelClass, primaryButton } from "../styles";

function ApplicationForm({
    initial,
    onSubmit,
}: {
    initial: RiderApplication;
    onSubmit: (application: RiderApplication) => Promise<void>;
}) {
    const [form, setForm] = useState(initial);
    const [busy, setBusy] = useState(false);
    const set = (key: Exclude<keyof RiderApplication, "gender" | "campusId">) => (value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    const valid =
        !!form.gender &&
        !!form.campusId &&
        !!form.name.trim() &&
        PHONE_PATTERN.test(form.phone) &&
        !!form.vehicleNumber.trim() &&
        !!form.collegeId.trim();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!valid) return;
        setBusy(true);
        await onSubmit({
            name: form.name.trim(),
            phone: form.phone,
            vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
            collegeId: form.collegeId.trim(),
            campusId: form.campusId,
            gender: form.gender,
        });
        setBusy(false);
    };

    const field = (
        key: Exclude<keyof RiderApplication, "gender" | "campusId">,
        label: string,
        props: { placeholder: string; maxLength: number; inputMode?: "numeric" }
    ) => (
        <div>
            <label htmlFor={key} className={labelClass}>
                {label}
            </label>
            <input
                id={key}
                value={form[key]}
                onChange={(e) =>
                    set(key)(
                        key === "phone"
                            ? e.target.value.replace(/\D/g, "").slice(0, 10)
                            : e.target.value
                    )
                }
                className={inputClass}
                required
                {...props}
            />
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className={cardClass}>
            {field("name", "Full name", { placeholder: "As on your college ID", maxLength: 80 })}
            <fieldset>
                <legend className={labelClass}>Gender</legend>
                <div className="grid grid-cols-3 gap-2">
                    {RIDER_GENDERS.map((gender) => (
                        <button
                            key={gender}
                            type="button"
                            aria-pressed={form.gender === gender}
                            onClick={() => setForm((f) => ({ ...f, gender }))}
                            className={`py-3 rounded-xl border text-sm font-bold capitalize transition-all ${form.gender === gender ? "bg-orange-500/15 border-orange-500 text-white" : "bg-black/30 border-white/10 text-gray-400"}`}
                        >
                            {gender}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1">
                    Female riders also get requests from guests who prefer a female rider.
                </p>
            </fieldset>
            <fieldset>
                <legend className={labelClass}>Campus</legend>
                <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_CAMPUS_CONFIG.map((campus) => (
                        <button
                            key={campus.id}
                            type="button"
                            aria-pressed={form.campusId === campus.id}
                            onClick={() => setForm((f) => ({ ...f, campusId: campus.id }))}
                            className={`py-3 rounded-xl border text-sm font-bold transition-all ${form.campusId === campus.id ? "bg-orange-500/15 border-orange-500 text-white" : "bg-black/30 border-white/10 text-gray-400"}`}
                        >
                            {campus.name}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1">
                    You&apos;ll get ride requests booked on this campus.
                </p>
            </fieldset>
            {field("phone", "Phone", {
                placeholder: "10-digit number",
                maxLength: 10,
                inputMode: "numeric",
            })}
            {field("vehicleNumber", "Vehicle number", {
                placeholder: "KL 01 AB 1234",
                maxLength: 20,
            })}
            {field("collegeId", "College ID / roll number", {
                placeholder: "Roll number",
                maxLength: 40,
            })}
            <button type="submit" disabled={!valid || busy} className={primaryButton}>
                {busy ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                Submit application
            </button>
        </form>
    );
}

function VerifyLinks({ rider, settings }: { rider: Rider; settings: RidesSettings }) {
    const message = riderVerificationMessage(rider);
    const hasContact = settings.whatsappNumber || settings.telegramUsername;
    return (
        <div className="space-y-3">
            <p className="text-sm text-gray-400">
                Message us with your ref{" "}
                <span className="font-mono text-white">{riderRef(rider.uid)}</span> and share your
                driving licence, vehicle RC and college ID to get verified.
            </p>
            {settings.whatsappNumber && (
                <a
                    href={whatsappUrl(settings.whatsappNumber, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all"
                >
                    Verify on WhatsApp
                </a>
            )}
            {settings.telegramUsername && (
                <a
                    href={telegramUrl(settings.telegramUsername, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl transition-all"
                >
                    Verify on Telegram
                </a>
            )}
            {!hasContact && (
                <p className="text-sm text-gray-500">
                    Verification contacts aren&apos;t set up yet. Please check back soon.
                </p>
            )}
        </div>
    );
}

const EMPTY_APPLICATION: RiderApplication = {
    name: "",
    phone: "",
    vehicleNumber: "",
    collegeId: "",
    campusId: "",
    gender: undefined,
};

export default function RiderRegisterPage() {
    const { user, loading } = useUserAuth();
    const { userDetails } = useCart();
    // undefined = still loading; null = hasn't applied
    const [rider, setRider] = useState<Rider | null | undefined>(undefined);
    const [settings, setSettings] = useState<RidesSettings | null>(null);
    const [isRiderClaim, setIsRiderClaim] = useState(false);
    const [editing, setEditing] = useState(false);

    const load = useCallback(async (signedIn: User, refreshToken: boolean) => {
        try {
            const [r, s, token] = await Promise.all([
                fetchRider(signedIn.uid),
                fetchRidesSettings(),
                // Force-refresh once on load so a freshly approved rider sees it.
                signedIn.getIdTokenResult(refreshToken),
            ]);
            setRider(r);
            setSettings(s);
            setIsRiderClaim(token.claims.rider === true);
        } catch (error) {
            console.error("Failed to load rider application:", error);
            toast.error("Couldn't load your application. Please refresh.");
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRider(undefined);
        setIsRiderClaim(false);
        setEditing(false);
        if (user) void load(user, true);
    }, [user, load]);

    const handleSubmit = async (application: RiderApplication) => {
        if (!user) return;
        try {
            await submitRiderApplication(
                { uid: user.uid, email: user.email },
                application,
                rider == null
            );
            setEditing(false);
            await load(user, false);
        } catch (error) {
            console.error("Failed to submit rider application:", error);
            toast.error("Couldn't submit. Please try again.");
        }
    };

    const initial = rider
        ? {
              name: rider.name,
              phone: rider.phone,
              vehicleNumber: rider.vehicleNumber,
              collegeId: rider.collegeId,
              campusId: rider.campusId,
              gender: rider.gender,
          }
        : { ...EMPTY_APPLICATION, campusId: userDetails.campus ?? "" };

    let content;
    if (loading || (user && (rider === undefined || !settings))) {
        content = (
            <div className="flex justify-center py-12">
                <Loader2 size={28} className="animate-spin text-gray-500" />
            </div>
        );
    } else if (!user) {
        content = <AuthCard />;
    } else if (isRiderClaim || rider?.status === "approved") {
        content = (
            <div className={`${cardClass} text-center`}>
                <CheckCircle2 size={48} className="text-green-400 mx-auto" />
                <h2 className="text-xl font-black">You&apos;re a Pumato rider</h2>
                <p className="text-sm text-gray-400">You&apos;re verified and ready to ride.</p>
                <Link href="/rides/rider" className={primaryButton}>
                    <Bike size={20} /> Go to rider dashboard
                </Link>
            </div>
        );
    } else if (rider?.status === "revoked") {
        content = (
            <div className={`${cardClass} text-center`}>
                <XCircle size={48} className="text-red-400 mx-auto" />
                <h2 className="text-xl font-black">Rider access removed</h2>
                <p className="text-sm text-gray-400">Please contact the Pumato team.</p>
            </div>
        );
    } else if (!rider || editing || rider.status === "rejected") {
        content = (
            <>
                {rider?.status === "rejected" && !editing && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                        Your last application wasn&apos;t approved. Check your details and apply
                        again.
                    </p>
                )}
                <ApplicationForm initial={initial} onSubmit={handleSubmit} />
            </>
        );
    } else {
        content = (
            <div className={cardClass}>
                <div className="flex items-center gap-3">
                    <Clock size={24} className="text-orange-400 shrink-0" />
                    <div>
                        <h2 className="font-black">Application received</h2>
                        <p className="text-xs text-gray-500">Waiting for manual verification</p>
                    </div>
                </div>
                <VerifyLinks rider={rider} settings={settings!} />
                <button
                    onClick={() => setEditing(true)}
                    className="w-full text-sm text-gray-400 hover:text-white"
                >
                    Edit my details
                </button>
            </div>
        );
    }

    return (
        <RidesShell title="Become a rider" subtitle="Give rides around campus with Pumato Rides.">
            <div className={mainColumn}>{content}</div>

            <Steps
                title="What you need"
                steps={[
                    "A Pumato account, and your name, phone and vehicle number.",
                    "Your driving licence, vehicle RC and college ID to share with us.",
                    "Once we verify them, you can go online and take rides.",
                ]}
                footer={
                    <p className="text-sm text-gray-500">
                        Already a rider?{" "}
                        <Link href="/rides/rider" className="text-orange-400 font-bold">
                            Go to your dashboard →
                        </Link>
                    </p>
                }
            />
        </RidesShell>
    );
}
