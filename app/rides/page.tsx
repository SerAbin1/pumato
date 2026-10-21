"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Bike, CheckCircle2, Loader2, MapPin, Navigation } from "lucide-react";
import { createRideRequest, fetchRidesSettings } from "@/lib/repositories";
import { PHONE_PATTERN } from "@/lib/schemas/rides";
import { activePlaces, formatFare, routeFare } from "@/lib/rides";
import CustomSelect from "@/app/components/CustomSelect";
import { inputClass, labelClass } from "./styles";
import RidesShell, { mainColumn, Steps } from "./components/RidesShell";
import type { RideFares, RidePlace } from "@/lib/types";

const GUEST_KEY = "pumato_rides_guest";

export default function RidesPage() {
    const [places, setPlaces] = useState<RidePlace[] | null>(null);
    const [fares, setFares] = useState<RideFares>({});
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [pickupId, setPickupId] = useState("");
    const [dropId, setDropId] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [booked, setBooked] = useState(false);

    useEffect(() => {
        fetchRidesSettings()
            .then((s) => {
                setPlaces(activePlaces(s.places));
                setFares(s.fares);
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
    }, []);

    const byId = useMemo(() => new Map(places?.map((p) => [p.id, p])), [places]);
    const pickup = byId.get(pickupId);
    const drop = byId.get(dropId);
    const fare = pickup && drop ? routeFare(fares, pickup.id, drop.id) : null;
    const canSubmit =
        !!pickup && !!drop && pickupId !== dropId && !!name.trim() && PHONE_PATTERN.test(phone);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!pickup || !drop || !canSubmit) return;
        setSubmitting(true);
        try {
            await createRideRequest({
                name: name.trim(),
                phone,
                pickupId: pickup.id,
                pickupName: pickup.name,
                dropId: drop.id,
                dropName: drop.name,
                fare,
            });
            try {
                localStorage.setItem(GUEST_KEY, JSON.stringify({ name: name.trim(), phone }));
            } catch {
                // Not remembering the guest is fine.
            }
            setBooked(true);
        } catch (error) {
            console.error("Failed to book ride:", error);
            toast.error("Couldn't book the ride. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setBooked(false);
        setPickupId("");
        setDropId("");
    };

    return (
        <RidesShell title="Pumato Rides" subtitle="Anywhere on campus, fast.">
            <div className={mainColumn}>
                {booked ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4">
                        <CheckCircle2 size={48} className="text-green-400 mx-auto" />
                        <h2 className="text-xl font-black">Ride requested</h2>
                        <p className="text-gray-400 text-sm">
                            {pickup?.name} → {drop?.name}
                            {fare !== null && <> · {formatFare(fare)}</>}
                            <br />A rider will call you on {phone} shortly.
                        </p>
                        <button
                            onClick={reset}
                            className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            Book another ride
                        </button>
                    </div>
                ) : places === null ? (
                    <div className="flex justify-center py-12">
                        <Loader2 size={28} className="animate-spin text-gray-500" />
                    </div>
                ) : places.length < 2 ? (
                    <p className="text-center text-gray-400 bg-white/5 border border-white/10 rounded-3xl p-8">
                        Rides aren&apos;t available yet. Check back soon!
                    </p>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5"
                    >
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
                            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                            {submitting ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Bike size={20} />
                            )}
                            Book ride
                        </button>
                    </form>
                )}
            </div>

            <Steps
                title="How it works"
                steps={[
                    "Pick where you are and where you're going.",
                    "Book with your name and phone number.",
                    "The first available rider accepts and calls you.",
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
        </RidesShell>
    );
}
