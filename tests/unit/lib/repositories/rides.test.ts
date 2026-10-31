import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

// Fake Firestore: refs and query builders tag their arguments so tests can read them back.
const mocks = vi.hoisted(() => ({
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    runTransaction: vi.fn(),
    onSnapshot: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: { __db: true } }));
vi.mock("firebase/firestore", () => ({
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
    collection: (_db: unknown, name: string) => ({ collection: name }),
    getDoc: mocks.getDoc,
    getDocs: mocks.getDocs,
    addDoc: mocks.addDoc,
    updateDoc: mocks.updateDoc,
    deleteDoc: mocks.deleteDoc,
    onSnapshot: mocks.onSnapshot,
    setDoc: vi.fn(),
    runTransaction: mocks.runTransaction,
    serverTimestamp: () => "SERVER_TS",
    deleteField: () => "DELETE",
    query: (...args: unknown[]) => ({ __query: args }),
    where: (...args: unknown[]) => ({ where: args }),
    orderBy: (...args: unknown[]) => ({ orderBy: args }),
    limit: (n: number) => ({ limit: n }),
    Timestamp: {
        fromDate: (d: Date) => ({ __ts: d }),
        fromMillis: (ms: number) => ({ __ms: ms }),
    },
}));

const {
    fetchRidesSettings,
    createRideRequest,
    confirmRide,
    widenRideRequest,
    cancelRideRequest,
    rateRide,
    releaseRide,
    setRiderGender,
    subscribeRider,
    setRiderCampus,
    subscribePendingRides,
    subscribeUpcomingRides,
    subscribeRiderRides,
    subscribeMyRides,
    fetchRiderCompletedRides,
    subscribeRideAvailability,
    subscribeAdminRideRequests,
    offerHigherFare,
    confirmRideByUser,
    joinRideWaitlist,
    leaveRideWaitlist,
    subscribeWaitlistEntry,
    subscribeRideStats,
    acceptRide,
} = await import("@/lib/repositories/rides");
const { DEFAULT_RIDE_SCHEDULE } = await import("@/lib/rides");

type Tagged = { __query: unknown[] };
const lastQuery = () => mocks.onSnapshot.mock.calls.at(-1)![0] as Tagged;
const constraints = (q: Tagged) => q.__query.slice(1);

/** Feeds `docs` to the last onSnapshot listener. */
const emit = (docs: { id: string; data: Record<string, unknown> }[]) =>
    mocks.onSnapshot.mock.calls.at(-1)![1]({
        docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
    });

const booking = {
    name: "Asha",
    phone: "9876543210",
    pickupId: "gate",
    pickupName: "Gate 1",
    dropId: "lib",
    dropName: "Library",
    fare: 20,
    campusId: "PU",
    userId: "u1",
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.addDoc.mockResolvedValue({ id: "new-ride" });
});

describe("fetchRidesSettings", () => {
    it("fills in the default schedule for settings saved before it existed", async () => {
        mocks.getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ whatsappNumber: "1", telegramUsername: "", places: [], fares: {} }),
        });
        expect((await fetchRidesSettings()).schedule).toEqual(DEFAULT_RIDE_SCHEDULE);
    });
});

describe("createRideRequest", () => {
    it("books a ride now with no schedule fields, linked to its user", async () => {
        expect(await createRideRequest({ ...booking, riderPreference: "female" })).toBe("new-ride");
        const [ref, data] = mocks.addDoc.mock.calls[0];
        expect(ref).toEqual({ collection: "ride_requests" });
        expect(data).toMatchObject({
            status: "pending",
            riderPreference: "female",
            userId: "u1",
            createdAt: "SERVER_TS",
        });
        expect(data).not.toHaveProperty("scheduledFor");
    });

    it("refuses a booking with no signed-in user", async () => {
        const { userId: _userId, ...withoutUser } = booking;
        await expect(
            createRideRequest({ ...withoutUser, riderPreference: "any" } as never)
        ).rejects.toThrow();
        expect(mocks.addDoc).not.toHaveBeenCalled();
    });

    it("stores a scheduled ride's time as a timestamp, with its user", async () => {
        const at = new Date("2026-10-25T11:00:00Z");
        await createRideRequest({
            ...booking,
            riderPreference: "any",
            scheduledFor: at,
        });
        expect(mocks.addDoc.mock.calls[0][1]).toMatchObject({
            userId: "u1",
            scheduledFor: { __ts: at },
        });
    });
});

describe("ride updates", () => {
    it("confirms a scheduled ride for the rider", async () => {
        await confirmRide("r1");
        expect(mocks.updateDoc).toHaveBeenCalledWith(
            { path: "ride_requests/r1" },
            { riderConfirmedAt: "SERVER_TS" }
        );
    });

    it("releases a ride with its confirmation, so the next rider is asked afresh", async () => {
        await releaseRide("r1");
        expect(mocks.updateDoc).toHaveBeenCalledWith(
            { path: "ride_requests/r1" },
            {
                status: "pending",
                riderUid: "DELETE",
                riderName: "DELETE",
                riderPhoneMasked: "DELETE",
                riderRating: "DELETE",
                riderRatingCount: "DELETE",
                acceptedAt: "DELETE",
                userConfirmedAt: "DELETE",
                confirmRequestedAt: "DELETE",
                riderConfirmedAt: "DELETE",
            }
        );
    });

    it("widens a female-preference request to every rider", async () => {
        await widenRideRequest("r1");
        expect(mocks.updateDoc).toHaveBeenCalledWith(
            { path: "ride_requests/r1" },
            { riderPreference: "any" }
        );
    });

    it("rates a completed ride", async () => {
        await rateRide("r1", 4);
        expect(mocks.updateDoc).toHaveBeenCalledWith({ path: "ride_requests/r1" }, { rating: 4 });
    });

    it("refuses a rating outside one to five stars", async () => {
        await expect(rateRide("r1", 6)).rejects.toThrow();
        expect(mocks.updateDoc).not.toHaveBeenCalled();
    });

    it("cancels a ride", async () => {
        await cancelRideRequest("r1");
        expect(mocks.updateDoc).toHaveBeenCalledWith(
            { path: "ride_requests/r1" },
            { status: "cancelled", cancelledAt: "SERVER_TS" }
        );
    });
});

describe("subscribeRider", () => {
    it("follows the rider's own doc, null until they apply", () => {
        const onChange = vi.fn();
        subscribeRider("rider1", onChange, vi.fn());
        const [ref, listener] = mocks.onSnapshot.mock.calls.at(-1)!;
        expect(ref).toEqual({ path: "riders/rider1" });

        listener({ exists: () => false, data: () => undefined });
        expect(onChange).toHaveBeenLastCalledWith(null);

        listener({ exists: () => true, data: () => ({ name: "Ravi", ratingCount: 2 }) });
        expect(onChange).toHaveBeenLastCalledWith({ name: "Ravi", ratingCount: 2 });
    });
});

describe("setRiderCampus", () => {
    it("moves a rider to another campus for the admin", async () => {
        await setRiderCampus("rider1", "PTU");
        expect(mocks.updateDoc).toHaveBeenCalledWith(
            { path: "riders/rider1" },
            { campusId: "PTU", updatedAt: "SERVER_TS" }
        );
    });
});

describe("setRiderGender", () => {
    it("records a rider's gender for the admin", async () => {
        await setRiderGender("rider1", "female");
        expect(mocks.updateDoc).toHaveBeenCalledWith(
            { path: "riders/rider1" },
            { gender: "female", updatedAt: "SERVER_TS" }
        );
    });
});

describe("rider subscriptions", () => {
    const now = new Date("2026-10-24T16:40:00Z");

    it("lists today's pending ride-now requests the rider may see, oldest first", () => {
        const onChange = vi.fn();
        subscribePendingRides("PU", ["any"], onChange, vi.fn(), now);
        expect(constraints(lastQuery())).toEqual([
            { where: ["status", "==", "pending"] },
            { where: ["campusId", "==", "PU"] },
            { where: ["riderPreference", "in", ["any"]] },
            { where: ["createdAt", ">=", expect.anything()] },
            { orderBy: ["createdAt", "asc"] },
        ]);

        // Scheduled rides booked today have their own list.
        emit([
            { id: "now", data: { pickupName: "A" } },
            { id: "later", data: { pickupName: "B", scheduledFor: { toDate: () => now } } },
        ]);
        expect(onChange).toHaveBeenCalledWith([{ id: "now", pickupName: "A" }]);
    });

    it("lists pending scheduled requests from an hour ago on, soonest first", () => {
        subscribeUpcomingRides("PU", ["any", "female"], vi.fn(), vi.fn(), now);
        expect(constraints(lastQuery())).toEqual([
            { where: ["status", "==", "pending"] },
            { where: ["campusId", "==", "PU"] },
            { where: ["riderPreference", "in", ["any", "female"]] },
            { where: ["scheduledFor", ">=", { __ts: new Date("2026-10-24T15:40:00Z") }] },
            { orderBy: ["scheduledFor", "asc"] },
        ]);
    });

    it("lists the rider's accepted rides", () => {
        subscribeRiderRides("rider1", vi.fn(), vi.fn());
        expect(constraints(lastQuery())).toEqual([
            { where: ["riderUid", "==", "rider1"] },
            { where: ["status", "==", "accepted"] },
        ]);
    });
});

describe("guest subscriptions", () => {
    it("lists every ride the user booked, ride now or scheduled, newest first", () => {
        subscribeMyRides("u1", vi.fn(), vi.fn());
        expect(constraints(lastQuery())).toEqual([
            { where: ["userId", "==", "u1"] },
            { orderBy: ["createdAt", "desc"] },
            { limit: 30 },
        ]);
    });

    it("reads the campus's rider availability, treating a missing one as nobody available", () => {
        const onChange = vi.fn();
        subscribeRideAvailability("PU", onChange);
        const [ref, listener] = mocks.onSnapshot.mock.calls.at(-1)!;
        expect(ref).toEqual({ path: "site_content/rides_availability" });

        listener({ data: () => undefined });
        expect(onChange).toHaveBeenLastCalledWith({ femaleOnline: false, femaleApproved: false });

        listener({ data: () => ({ PTU: { femaleOnline: true, femaleApproved: true } }) });
        expect(onChange).toHaveBeenLastCalledWith({ femaleOnline: false, femaleApproved: false });

        listener({ data: () => ({ PU: { femaleOnline: false, femaleApproved: true } }) });
        expect(onChange).toHaveBeenLastCalledWith({ femaleOnline: false, femaleApproved: true });
    });
});

describe("subscribeAdminRideRequests", () => {
    it("lists the newest requests first, up to the page size, with their ids", () => {
        const onChange = vi.fn();
        subscribeAdminRideRequests(50, onChange, vi.fn());
        expect(constraints(lastQuery())).toEqual([
            { orderBy: ["createdAt", "desc"] },
            { limit: 50 },
        ]);

        emit([{ id: "r1", data: { pickupName: "Gate 1", status: "pending" } }]);
        expect(onChange).toHaveBeenCalledWith([
            { id: "r1", pickupName: "Gate 1", status: "pending" },
        ]);
    });
});

describe("fetchRiderCompletedRides", () => {
    const completedAt = { toDate: () => new Date(1000) };

    it("fetches the rider's latest completed rides on a first visit", async () => {
        mocks.getDocs.mockResolvedValue({
            docs: [{ id: "r1", data: () => ({ name: "Asha", completedAt }) }],
        });
        expect(await fetchRiderCompletedRides("rider1", null)).toEqual([
            { id: "r1", name: "Asha", completedAt },
        ]);
        expect(constraints(mocks.getDocs.mock.calls[0][0])).toEqual([
            { where: ["riderUid", "==", "rider1"] },
            { where: ["status", "==", "completed"] },
            { orderBy: ["completedAt", "desc"] },
            { limit: 100 },
        ]);
    });

    it("fetches only rides completed since the last sync", async () => {
        mocks.getDocs.mockResolvedValue({ docs: [] });
        await fetchRiderCompletedRides("rider1", 5000);
        expect(constraints(mocks.getDocs.mock.calls[0][0])).toEqual([
            { where: ["riderUid", "==", "rider1"] },
            { where: ["status", "==", "completed"] },
            { where: ["completedAt", ">", { __ms: 5000 }] },
            { orderBy: ["completedAt", "desc"] },
        ]);
    });
});

function fakeTransaction(data: Record<string, unknown> | null) {
    const tx = {
        get: vi.fn(async () => ({ exists: () => data !== null, data: () => data ?? undefined })),
        update: vi.fn(),
        set: vi.fn(),
    };
    mocks.runTransaction.mockImplementation(async (_db, fn) => fn(tx));
    return tx;
}

describe("offerHigherFare", () => {
    it("adds the offer to the fare and returns the new one", async () => {
        const tx = fakeTransaction({ status: "pending", fare: 20 });
        expect(await offerHigherFare("r1", 10)).toBe(30);
        expect(tx.update).toHaveBeenCalledWith({ path: "ride_requests/r1" }, { fare: 30 });
    });

    it("refuses an increase that isn't ₹5, ₹10 or ₹15", async () => {
        fakeTransaction({ status: "pending", fare: 20 });
        await expect(offerHigherFare("r1", 7)).rejects.toThrow();
        expect(mocks.runTransaction).not.toHaveBeenCalled();
    });

    it("refuses to raise the fare once a rider has it", async () => {
        fakeTransaction({ status: "accepted", fare: 20 });
        await expect(offerHigherFare("r1", 5)).rejects.toThrow();
    });
});

describe("acceptRide", () => {
    it("snapshots the rider's masked phone and rating for the user", async () => {
        mocks.getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ name: "Ravi", phone: "9876543210", ratingSum: 19, ratingCount: 4 }),
        });
        const tx = fakeTransaction({ status: "pending" });
        await acceptRide("r1", { uid: "rider1", name: "Ravi" });

        expect(mocks.getDoc).toHaveBeenCalledWith({ path: "riders/rider1" });
        expect(tx.update).toHaveBeenCalledWith(
            { path: "ride_requests/r1" },
            {
                status: "accepted",
                riderUid: "rider1",
                riderName: "Ravi",
                riderPhoneMasked: "98******10",
                riderRating: 4.8,
                riderRatingCount: 4,
                acceptedAt: "SERVER_TS",
            }
        );
    });

    it("leaves the rating off a rider nobody has rated yet", async () => {
        mocks.getDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ name: "Ravi", phone: "9876543210" }),
        });
        const tx = fakeTransaction({ status: "pending" });
        await acceptRide("r1", { uid: "rider1", name: "Ravi" });
        const [, changes] = tx.update.mock.calls[0];
        expect(changes).not.toHaveProperty("riderRating");
        expect(changes).not.toHaveProperty("riderRatingCount");
    });
});

describe("confirmRideByUser", () => {
    it("records the user's confirmation", async () => {
        await confirmRideByUser("r1");
        expect(mocks.updateDoc).toHaveBeenCalledWith(
            { path: "ride_requests/r1" },
            { userConfirmedAt: "SERVER_TS" }
        );
    });
});

describe("ride waitlist", () => {
    it("signs a user up with their campus", async () => {
        const tx = fakeTransaction(null);
        await joinRideWaitlist("u1", "PTU");
        expect(tx.set).toHaveBeenCalledWith(
            { path: "ride_waitlist/u1" },
            {
                userId: "u1",
                campusId: "PTU",
                createdAt: "SERVER_TS",
                updatedAt: "SERVER_TS",
            }
        );
    });

    it("moves an existing sign-up to the campus they now want", async () => {
        const tx = fakeTransaction({ userId: "u1", campusId: "PTU" });
        await joinRideWaitlist("u1", "PIMS");
        expect(tx.update).toHaveBeenCalledWith(
            { path: "ride_waitlist/u1" },
            { campusId: "PIMS", updatedAt: "SERVER_TS" }
        );
        expect(tx.set).not.toHaveBeenCalled();
    });

    it("removes the sign-up when the user leaves", async () => {
        await leaveRideWaitlist("u1");
        expect(mocks.deleteDoc).toHaveBeenCalledWith({ path: "ride_waitlist/u1" });
    });

    it("follows the user's own sign-up", () => {
        const onChange = vi.fn();
        subscribeWaitlistEntry("u1", onChange, vi.fn());
        const [ref, listener] = mocks.onSnapshot.mock.calls.at(-1)!;
        expect(ref).toEqual({ path: "ride_waitlist/u1" });

        listener({ exists: () => false });
        expect(onChange).toHaveBeenLastCalledWith(null);

        listener({ exists: () => true, data: () => ({ userId: "u1", campusId: "PTU" }) });
        expect(onChange).toHaveBeenLastCalledWith({ userId: "u1", campusId: "PTU" });
    });
});

describe("subscribeRideStats", () => {
    it("reads the public counters, defaulting anything not written yet", () => {
        const onChange = vi.fn();
        subscribeRideStats(onChange);
        expect(mocks.onSnapshot.mock.calls.at(-1)![0]).toEqual({
            path: "site_content/rides_stats",
        });

        mocks.onSnapshot.mock.calls.at(-1)![1]({ data: () => undefined });
        expect(onChange).toHaveBeenLastCalledWith({
            totalRiders: 0,
            onlineRiders: 0,
            completedRides: 0,
            waitlist: {},
        });

        mocks.onSnapshot.mock.calls.at(-1)![1]({
            data: () => ({ totalRiders: 4, waitlist: { PTU: 3 } }),
        });
        expect(onChange).toHaveBeenLastCalledWith({
            totalRiders: 4,
            onlineRiders: 0,
            completedRides: 0,
            waitlist: { PTU: 3 },
        });
    });
});
