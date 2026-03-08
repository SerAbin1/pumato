import {
    Calendar,
    CheckCircle2,
    ChevronDown,
    Clock,
    CreditCard,
    Loader2,
    MapPin,
    Package,
    Phone,
    Plus,
    RotateCcw,
    Shirt,
    Trash,
    Truck,
    User
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import { db } from "@/lib/firebase";

const PIPELINE_TABS = [
    {
        id: "ReadyForPickup",
        label: "Ready For Pickup",
        emptyMessage: "No pickup-ready orders right now.",
        actionLabel: "Mark Picked Up",
        actionIcon: Truck,
        actionClass: "bg-cyan-600 hover:bg-cyan-500 text-white",
    },
    {
        id: "PendingCustomerPayment",
        label: "Pending Customer Payment",
        emptyMessage: "No orders waiting for customer payment.",
        actionLabel: "Record Customer Payment",
        actionIcon: CreditCard,
        actionClass: "bg-emerald-600 hover:bg-emerald-500 text-white",
    },
    {
        id: "PendingShopPayment",
        label: "Pending Shop Payment",
        emptyMessage: "No orders waiting for shop payment.",
        actionLabel: "Record Payment To Shop",
        actionIcon: CreditCard,
        actionClass: "bg-violet-600 hover:bg-violet-500 text-white",
    },
    {
        id: "DeliveryPending",
        label: "Delivery Pending",
        emptyMessage: "No orders queued for delivery.",
        actionLabel: "Mark Delivered",
        actionIcon: CheckCircle2,
        actionClass: "bg-orange-600 hover:bg-orange-500 text-white",
    },
    {
        id: "Completed",
        label: "Completed",
        emptyMessage: "No completed laundry orders yet.",
        actionLabel: null,
        actionIcon: CheckCircle2,
        actionClass: "",
    },
];

const TOP_TABS = [
    ...PIPELINE_TABS.map((tab) => ({ id: tab.id, label: tab.label })),
    { id: "settings", label: "Settings" },
];

const formatDisplayDate = (dateString) => {
    if (!dateString) return "No Date";
    const [year, month, day] = dateString.split("-");
    if (!year || !month || !day) return dateString;
    return `${day}-${month}-${year}`;
};

const formatTimestamp = (value) => {
    if (!value) return "";
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const resolveOrderStage = (order) => {
    if (order.status === "Completed" || order.status === "Delivered" || order.deliveredToCustomerAt) {
        return "Completed";
    }
    if (order.status === "DeliveryPending" || order.status === "PaidToShop" || order.paidToShopAt) {
        return "DeliveryPending";
    }
    if (order.status === "PendingShopPayment" || order.status === "CustomerPaid" || order.customerPaidAt) {
        return "PendingShopPayment";
    }
    if (order.status === "PendingCustomerPayment" || order.pickedUpFromCustomerAt) {
        return "PendingCustomerPayment";
    }
    return "ReadyForPickup";
};

function EmptyOrdersState({ message }) {
    return (
        <div className="text-center py-16 text-gray-500 border border-dashed border-white/10 rounded-[2rem] bg-white/5">
            <Package className="mx-auto mb-4 text-gray-600" size={28} />
            <p className="font-medium">{message}</p>
        </div>
    );
}

function OrderDateGroup({ title, orders, renderOrder }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <h4 className="text-[11px] font-black tracking-[0.25em] text-cyan-300 uppercase">{title}</h4>
                <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="space-y-3">
                {orders.map(renderOrder)}
            </div>
        </div>
    );
}

function InputModal({
    isOpen,
    title,
    description,
    value,
    setValue,
    placeholder,
    confirmLabel,
    onClose,
    onConfirm,
    loading,
    inputType = "number",
    secondaryValue,
    setSecondaryValue,
    secondaryPlaceholder,
    secondaryType = "text"
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                        className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-[#101114] p-6 shadow-2xl"
                    >
                        <h3 className="text-2xl font-black text-white">{title}</h3>
                        <p className="mt-2 text-sm text-gray-400">{description}</p>
                        <div className="mt-5 space-y-3">
                            <input
                                type={inputType}
                                min={inputType === "number" ? "0" : undefined}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                placeholder={placeholder}
                                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-cyan-500/50"
                            />
                            {typeof secondaryValue === "string" && setSecondaryValue && (
                                <input
                                    type={secondaryType}
                                    value={secondaryValue}
                                    onChange={(e) => setSecondaryValue(e.target.value)}
                                    placeholder={secondaryPlaceholder}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white outline-none focus:border-cyan-500/50"
                                />
                            )}
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-gray-300 transition-colors hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={loading}
                                className="flex-1 rounded-xl bg-cyan-600 px-4 py-3 font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-60"
                            >
                                {loading ? "Saving..." : confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function PipelineOrderCard({
    order,
    stageId,
    stageLabel,
    actionLabel,
    ActionIcon,
    actionClass,
    isExpanded,
    onToggle,
    onPrimaryAction,
    onReschedule,
    processing
}) {
    const itemCount = order.items?.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0) || 0;
    const history = [
        { label: "Order created", value: order.createdAt },
        { label: "Pickup recorded", value: order.pickedUpFromCustomerAt },
        {
            label: order.customerPaidAmount ? `Customer paid ₹${order.customerPaidAmount}` : "Customer payment pending",
            value: order.customerPaidAt
        },
        {
            label: order.paidToShopAmount ? `Paid to shop ₹${order.paidToShopAmount}` : "Shop payment pending",
            value: order.paidToShopAt
        },
        { label: "Delivered", value: order.deliveredToCustomerAt },
        { label: "Rescheduled", value: order.rescheduledAt },
    ].filter((entry) => entry.value);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-xl"
        >
            <div className="p-4 md:p-5">
                <div className="flex flex-col gap-4">
                    <button
                        onClick={onToggle}
                        className="w-full text-left"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
                                        {stageLabel}
                                    </span>
                                    <span className="text-xs text-gray-500">{formatDisplayDate(order.scheduledDate)} · {order.scheduledSlot || "No slot"}</span>
                                </div>
                                <div>
                                    <h3 className="truncate text-lg font-black text-white">{order.name || "Unnamed Customer"}</h3>
                                    <p className="truncate text-sm text-gray-400">{order.phone || "No phone"} · {order.campus || "No campus"}</p>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                                    <span>{itemCount} items</span>
                                    <span>{order.location || "No address"}</span>
                                </div>
                            </div>
                            <ChevronDown
                                size={18}
                                className={`mt-1 shrink-0 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                        </div>
                    </button>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-gray-500">
                            {order.createdAt ? `Placed ${formatTimestamp(order.createdAt)}` : "Recently placed"}
                        </div>
                        {actionLabel ? (
                            <button
                                onClick={onPrimaryAction}
                                disabled={processing}
                                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors sm:w-auto ${actionClass} disabled:opacity-60`}
                            >
                                {processing ? <Loader2 size={16} className="animate-spin" /> : <ActionIcon size={16} />}
                                {actionLabel}
                            </button>
                        ) : (
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Read only</div>
                        )}
                    </div>
                </div>

                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-[1.05fr_0.95fr]">
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Customer</p>
                                        <div className="space-y-2 text-sm text-gray-300">
                                            <p className="flex items-center gap-2"><User size={14} className="text-gray-500" /> {order.name || "Unnamed Customer"}</p>
                                            <p className="flex items-center gap-2"><Phone size={14} className="text-gray-500" /> {order.phone || "No phone"}</p>
                                            <p className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0 text-gray-500" /> {order.location || "No address provided"}</p>
                                            {order.distance && <p className="text-gray-400">Distance: {order.distance}</p>}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Items</p>
                                        <div className="space-y-2">
                                            {order.items?.map((item, idx) => (
                                                <div key={`${item.name}-${idx}`} className="flex items-center justify-between gap-3 text-sm text-gray-200">
                                                    <div className="flex items-center gap-3">
                                                        <Shirt size={14} className="text-gray-500" />
                                                        <span>{item.name}</span>
                                                        {item.steamIron && (
                                                            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                                                                Steam Iron
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-white">x{item.quantity || 1}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {order.instructions && (
                                        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-yellow-300">Instructions</p>
                                            <p className="text-sm text-yellow-100/90">{order.instructions}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">Workflow History</p>
                                            {stageId !== "Completed" && (
                                                <button
                                                    onClick={onReschedule}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 transition-colors hover:text-white"
                                                >
                                                    <RotateCcw size={12} />
                                                    Reschedule
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300">
                                                Pickup: {formatDisplayDate(order.scheduledDate)} · {order.scheduledSlot || "No slot"}
                                            </div>
                                            {history.length === 0 ? (
                                                <p className="text-sm text-gray-500">No workflow actions recorded yet.</p>
                                            ) : (
                                                history.map((entry) => (
                                                    <div key={`${entry.label}-${entry.value?.seconds || entry.value}`} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                                                        <span className="text-gray-300">{entry.label}</span>
                                                        <span className="shrink-0 text-xs text-gray-500">{formatTimestamp(entry.value)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default function LaundrySettings({
    laundrySlots,
    selectedDay,
    setSelectedDay,
    slotStart,
    setSlotStart,
    slotEnd,
    setSlotEnd,
    handleAddSlot,
    handleDeleteSlot,
    laundryOrders = [],
    loadingLaundryOrders = false
}) {
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, slotIdx: null, slotName: "" });
    const [activeTab, setActiveTab] = useState("ReadyForPickup");
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [processingOrderId, setProcessingOrderId] = useState(null);
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, type: null, order: null, amount: "" });
    const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, order: null, date: "", slot: "" });

    const updateOrder = async (orderId, updates, successMessage) => {
        setProcessingOrderId(orderId);
        try {
            await updateDoc(doc(db, "laundry_orders", orderId), {
                ...updates,
                updatedAt: serverTimestamp(),
            });
            toast.success(successMessage);
        } catch (error) {
            console.error("Failed to update laundry order:", error);
            toast.error("Failed to update laundry order");
        } finally {
            setProcessingOrderId(null);
        }
    };

    const filteredOrders = useMemo(() => {
        return laundryOrders.filter((order) => resolveOrderStage(order) === activeTab);
    }, [laundryOrders, activeTab]);

    const groupedOrders = useMemo(() => {
        return filteredOrders.reduce((acc, order) => {
            const key = order.scheduledDate || "No Date";
            if (!acc[key]) acc[key] = [];
            acc[key].push(order);
            return acc;
        }, {});
    }, [filteredOrders]);

    const tabCounts = useMemo(() => (
        laundryOrders.reduce((acc, order) => {
            acc[resolveOrderStage(order)] += 1;
            return acc;
        }, {
            ReadyForPickup: 0,
            PendingCustomerPayment: 0,
            PendingShopPayment: 0,
            DeliveryPending: 0,
            Completed: 0,
        })
    ), [laundryOrders]);

    const handlePrimaryAction = async (order, stageId) => {
        if (stageId === "ReadyForPickup") {
            await updateOrder(order.id, {
                status: "PendingCustomerPayment",
                pickedUpFromCustomerAt: serverTimestamp(),
            }, "Pickup recorded");
            return;
        }

        if (stageId === "PendingCustomerPayment") {
            setPaymentModal({
                isOpen: true,
                type: "customer",
                order,
                amount: order.customerPaidAmount?.toString?.() || "",
            });
            return;
        }

        if (stageId === "PendingShopPayment") {
            setPaymentModal({
                isOpen: true,
                type: "shop",
                order,
                amount: order.paidToShopAmount?.toString?.() || "",
            });
            return;
        }

        if (stageId === "DeliveryPending") {
            await updateOrder(order.id, {
                status: "Completed",
                deliveredToCustomerAt: serverTimestamp(),
            }, "Delivery recorded");
        }
    };

    const submitPaymentModal = async () => {
        const amount = Number(paymentModal.amount);
        if (Number.isNaN(amount) || amount <= 0 || !paymentModal.order) {
            toast.error("Enter a valid amount");
            return;
        }

        if (paymentModal.type === "customer") {
            await updateOrder(paymentModal.order.id, {
                status: "PendingShopPayment",
                customerPaidAmount: amount,
                customerPaidAt: serverTimestamp(),
            }, "Customer payment recorded");
        } else {
            await updateOrder(paymentModal.order.id, {
                status: "DeliveryPending",
                paidToShopAmount: amount,
                paidToShopAt: serverTimestamp(),
            }, "Shop payment recorded");
        }

        setPaymentModal({ isOpen: false, type: null, order: null, amount: "" });
    };

    const openRescheduleModal = (order) => {
        setRescheduleModal({
            isOpen: true,
            order,
            date: order.scheduledDate || "",
            slot: order.scheduledSlot || "",
        });
    };

    const submitReschedule = async () => {
        if (!rescheduleModal.order || !rescheduleModal.date || !rescheduleModal.slot.trim()) {
            toast.error("Select a date and time slot");
            return;
        }

        await updateOrder(rescheduleModal.order.id, {
            scheduledDate: rescheduleModal.date,
            scheduledSlot: rescheduleModal.slot.trim(),
            rescheduledAt: serverTimestamp(),
        }, "Order rescheduled");

        setRescheduleModal({ isOpen: false, order: null, date: "", slot: "" });
    };

    return (
        <div className="space-y-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="flex gap-2 border-b border-white/10">
                    {TOP_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id ? "text-white border-cyan-500" : "text-gray-500 border-transparent hover:text-gray-300"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab !== "settings" && (
                    <div className="space-y-6 rounded-[2.5rem] border border-white/10 bg-white/5 p-5 shadow-2xl md:p-8">
                        <div className="flex flex-col gap-2">
                            <h2 className="flex items-center gap-3 text-3xl font-black text-white">
                                <Package className="text-cyan-500" />
                                Laundry Pipeline
                            </h2>
                            <p className="text-sm text-gray-400">Each tab represents one stage. Cards stay compact and expose a single primary action.</p>
                        </div>

                        {loadingLaundryOrders ? (
                            <div className="flex h-48 items-center justify-center text-gray-500">
                                <Loader2 className="mr-2 animate-spin" /> Loading laundry orders...
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <EmptyOrdersState message={PIPELINE_TABS.find((tab) => tab.id === activeTab)?.emptyMessage} />
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(groupedOrders)
                                    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                                    .map(([date, ordersForDate]) => {
                                        const currentTab = PIPELINE_TABS.find((tab) => tab.id === activeTab);
                                        return (
                                            <OrderDateGroup
                                                key={date}
                                                title={formatDisplayDate(date)}
                                                orders={ordersForDate}
                                                renderOrder={(order) => (
                                                    <PipelineOrderCard
                                                        key={order.id}
                                                        order={order}
                                                        stageId={activeTab}
                                                        stageLabel={currentTab.label}
                                                        actionLabel={currentTab.actionLabel}
                                                        ActionIcon={currentTab.actionIcon}
                                                        actionClass={currentTab.actionClass}
                                                        isExpanded={expandedOrderId === order.id}
                                                        onToggle={() => setExpandedOrderId((prev) => prev === order.id ? null : order.id)}
                                                        onPrimaryAction={() => handlePrimaryAction(order, activeTab)}
                                                        onReschedule={() => openRescheduleModal(order)}
                                                        processing={processingOrderId === order.id}
                                                    />
                                                )}
                                            />
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-8 shadow-2xl md:p-12">
                        <h2 className="mb-8 flex items-center gap-3 border-b border-white/10 pb-6 text-3xl font-black text-white">
                            <Clock className="text-cyan-500" /> Laundry Timeslots Management
                        </h2>

                        <div className="grid gap-12 md:grid-cols-2">
                            <div className="space-y-6">
                                <div className="mb-6 flex flex-wrap gap-2">
                                    {["default", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`rounded-xl border border-white/5 px-4 py-2 text-sm font-bold transition-all ${selectedDay === day ? "bg-cyan-500 text-white shadow-lg" : "bg-black/20 text-gray-500 hover:bg-white/10 hover:text-white"}`}
                                        >
                                            {day === "default" ? "Default" : day.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>

                                <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6">
                                    <h4 className="mb-2 text-xl font-bold text-cyan-400">
                                        Managing: <span className="text-white underline decoration-cyan-500/50">{selectedDay === "default" ? "Default Schedule" : selectedDay}</span>
                                    </h4>
                                    <p className="text-sm text-cyan-200/70">
                                        {selectedDay === "default"
                                            ? "These slots apply to any day that doesn't have specific slots set."
                                            : `Slots added here will OVERRIDE the default schedule for all ${selectedDay}s.`}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6">
                                    <h4 className="mb-2 flex items-center gap-2 font-bold text-blue-400"><Clock size={16} /> How it works</h4>
                                    <p className="text-sm leading-relaxed text-blue-200/70">
                                        Add available pickup time slots for the selected date. These appear in the Laundry booking form for users.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <label className="ml-1 block text-sm font-bold uppercase tracking-widest text-gray-400">Available Slots</label>

                                <div className="flex items-end gap-2">
                                    <div className="grid flex-1 grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="ml-1 text-[10px] font-bold uppercase text-gray-500">Start</label>
                                            <input
                                                type="time"
                                                value={slotStart}
                                                onChange={(e) => setSlotStart(e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 font-bold text-white outline-none focus:border-cyan-500/50 [color-scheme:dark]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="ml-1 text-[10px] font-bold uppercase text-gray-500">End</label>
                                            <input
                                                type="time"
                                                value={slotEnd}
                                                onChange={(e) => setSlotEnd(e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 font-bold text-white outline-none focus:border-cyan-500/50 [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddSlot}
                                        className="flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 transition-colors hover:bg-cyan-500"
                                        title="Add Slot"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>

                                <div className="max-h-[400px] space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                                    {laundrySlots.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-gray-500">
                                            No slots added for this date.
                                        </div>
                                    )}
                                    {laundrySlots.map((slot, idx) => (
                                        <div key={idx} className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition-colors hover:bg-white/10">
                                            <span className="font-bold text-gray-200">{slot}</span>
                                            <button
                                                onClick={() => setConfirmModal({ isOpen: true, slotIdx: idx, slotName: slot })}
                                                className="rounded-lg p-2 text-gray-500 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 md:opacity-0"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <InputModal
                isOpen={paymentModal.isOpen}
                title={paymentModal.type === "customer" ? "Record Customer Payment" : "Record Payment To Shop"}
                description={paymentModal.order ? `${paymentModal.order.name} · ${formatDisplayDate(paymentModal.order.scheduledDate)} · ${paymentModal.order.scheduledSlot || "No slot"}` : ""}
                value={paymentModal.amount}
                setValue={(value) => setPaymentModal((prev) => ({ ...prev, amount: value }))}
                placeholder="Enter amount"
                confirmLabel="Save Payment"
                onClose={() => setPaymentModal({ isOpen: false, type: null, order: null, amount: "" })}
                onConfirm={submitPaymentModal}
                loading={!!processingOrderId}
            />

            <InputModal
                isOpen={rescheduleModal.isOpen}
                title="Reschedule Order"
                description={rescheduleModal.order ? `Update pickup schedule for ${rescheduleModal.order.name}.` : ""}
                value={rescheduleModal.date}
                setValue={(value) => setRescheduleModal((prev) => ({ ...prev, date: value }))}
                placeholder="Pickup date"
                confirmLabel="Save Schedule"
                onClose={() => setRescheduleModal({ isOpen: false, order: null, date: "", slot: "" })}
                onConfirm={submitReschedule}
                loading={!!processingOrderId}
                inputType="date"
                secondaryValue={rescheduleModal.slot}
                setSecondaryValue={(value) => setRescheduleModal((prev) => ({ ...prev, slot: value }))}
                secondaryPlaceholder="Pickup time slot"
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={() => handleDeleteSlot(confirmModal.slotIdx)}
                title="Delete Timeslot?"
                message={`Are you sure you want to delete the timeslot "${confirmModal.slotName}"?`}
                confirmLabel="Delete"
            />
        </div>
    );
}
