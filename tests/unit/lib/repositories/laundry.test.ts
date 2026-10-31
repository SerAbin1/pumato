import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
    onSnapshot: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ db: { __db: true } }));
vi.mock("firebase/firestore", () => ({
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
    collection: (_db: unknown, name: string) => ({ collection: name }),
    onSnapshot: mocks.onSnapshot,
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    addDoc: vi.fn(),
    serverTimestamp: () => "SERVER_TS",
}));

const { subscribeLaundryOrders, sortLaundryOrders } = await import(
    "@/lib/repositories/laundry"
);

type Order = Parameters<typeof sortLaundryOrders>[0][number];

const order = (id: string, scheduledDate: string, createdAt: Date | null): Order =>
    ({ id, scheduledDate, createdAt }) as Order;

beforeEach(() => {
    vi.clearAllMocks();
});

describe("sortLaundryOrders", () => {
    it("groups by pickup day, then newest booking first within a day", () => {
        const sorted = sortLaundryOrders([
            order("late", "2026-10-25", new Date(1)),
            order("early", "2026-10-24", new Date(2)),
            order("earlyOld", "2026-10-24", new Date(3)),
        ]);
        expect(sorted.map((o) => o.id)).toEqual(["earlyOld", "early", "late"]);
    });

    it("sorts an order with no booking time as the oldest of its day", () => {
        const sorted = sortLaundryOrders([
            order("clocked", "2026-10-24", new Date(5)),
            order("stampless", "2026-10-24", null),
        ]);
        expect(sorted.map((o) => o.id)).toEqual(["clocked", "stampless"]);
    });
});

describe("subscribeLaundryOrders", () => {
    it("reads every order live, with its id and createdAt as a Date", () => {
        const onChange = vi.fn();
        const createdAt = { toDate: () => new Date("2026-10-24T10:00:00Z") };
        subscribeLaundryOrders(onChange, vi.fn());

        const [ref, listener] = mocks.onSnapshot.mock.calls.at(-1)!;
        expect(ref).toEqual({ collection: "laundry_orders" });

        listener({
            docs: [
                {
                    id: "o1",
                    data: () => ({ scheduledDate: "2026-10-24", createdAt }),
                },
            ],
        });

        expect(onChange).toHaveBeenCalledWith([
            {
                id: "o1",
                scheduledDate: "2026-10-24",
                createdAt: new Date("2026-10-24T10:00:00Z"),
            },
        ]);
    });

    it("reads a missing createdAt as null, so sorting never sees undefined", () => {
        const onChange = vi.fn();
        subscribeLaundryOrders(onChange, vi.fn());
        const [, listener] = mocks.onSnapshot.mock.calls.at(-1)!;
        listener({ docs: [{ id: "o1", data: () => ({ scheduledDate: "2026-10-24" }) }] });
        expect(onChange.mock.calls[0][0][0].createdAt).toBeNull();
    });
});
