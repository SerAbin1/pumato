import {
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    Loader2,
    Package,
    Plus,
    RotateCcw,
    Save,
    Shirt,
    Trash,
    Truck
} from "lucide-react";
import { useMemo, useState } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import { db } from "@/lib/firebase";

const ROOT_TABS = [
    { id: "settings", label: "Settings" },
    { id: "orders", label: "Orders" },
];

const ORDER_SUB_TABS = [
    { id: "scheduled", label: "Pending" },
    { id: "inprogress", label: "In Progress" },
    { id: "completed", label: "Completed" },
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

const getOrderStage = (order) => {
    if (order.status === "Delivered") return "completed";
    if (["CustomerPaid", "PaidToShop"].includes(order.status)) return "inprogress";
    return "scheduled";
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
                <h4 className="text-sm font-black tracking-[0.2em] text-cyan-300 uppercase">{title}</h4>
                <div className="h-px flex-1 bg-white/10" />
            </div>
            <div className="space-y-4">
                {orders.map(renderOrder)}
            </div>
        </div>
    );
}

function LaundryOrderCard({ order }) {
    const [isSaving, setIsSaving] = useState(false);
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState(order.scheduledDate || "");
    const [rescheduleSlot, setRescheduleSlot] = useState(order.scheduledSlot || "");
    const [customerPaidAmount, setCustomerPaidAmount] = useState(order.customerPaidAmount?.toString?.() || "");
    const [paidToShopAmount, setPaidToShopAmount] = useState(order.paidToShopAmount?.toString?.() || "");

    const updateOrder = async (updates, successMessage) => {
        setIsSaving(true);
        try {
            await updateDoc(doc(db, "laundry_orders", order.id), {
                ...updates,
                updatedAt: serverTimestamp(),
            });
            toast.success(successMessage);
        } catch (error) {
            console.error("Failed to update laundry order:", error);
            toast.error("Failed to update laundry order");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReschedule = async () => {
        if (!rescheduleDate || !rescheduleSlot.trim()) {
            toast.error("Select a date and time slot");
            return;
        }

        await updateOrder({
            scheduledDate: rescheduleDate,
            scheduledSlot: rescheduleSlot.trim(),
            rescheduledAt: serverTimestamp(),
        }, "Laundry order rescheduled");
        setIsRescheduling(false);
    };

    const handleCustomerPaid = async () => {
        const amount = Number(customerPaidAmount);
        if (Number.isNaN(amount) || amount <= 0) {
            toast.error("Enter a valid customer amount");
            return;
        }

        await updateOrder({
            customerPaidAmount: amount,
            customerPaidAt: serverTimestamp(),
            status: "CustomerPaid"
        }, "Customer payment marked");
    };

    const handleShopPaid = async () => {
        const amount = Number(paidToShopAmount);
        if (Number.isNaN(amount) || amount <= 0) {
            toast.error("Enter a valid shop amount");
            return;
        }

        await updateOrder({
            paidToShopAmount: amount,
            paidToShopAt: serverTimestamp(),
            status: "PaidToShop"
        }, "Shop payment marked");
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-xl">
            <div className="p-6 md:p-8 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                                {getOrderStage(order) === "completed" ? "Delivered" : getOrderStage(order) === "inprogress" ? "Picked Up" : "Scheduled"}
                            </span>
                            {order.customerPaidAt && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-green-500/20 bg-green-500/10 text-green-300">
                                    Customer Paid
                                </span>
                            )}
                            {order.paidToShopAt && (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300">
                                    Shop Paid
                                </span>
                            )}
                        </div>

                        <div>
                            <h3 className="text-2xl font-black text-white">{order.name || "Unnamed Customer"}</h3>
                            <p className="text-sm text-gray-400">{order.phone || "No phone"} · {order.campus || "No campus"} · {order.location || "No hostel"}</p>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                            <span className="flex items-center gap-2"><Calendar size={14} className="text-gray-500" /> {formatDisplayDate(order.scheduledDate)}</span>
                            <span className="flex items-center gap-2"><Clock size={14} className="text-gray-500" /> {order.scheduledSlot || "No slot"}</span>
                            {order.createdAt && (
                                <span className="text-gray-500">Placed {formatTimestamp(order.createdAt)}</span>
                            )}
                        </div>
                    </div>

                            <div className="bg-black/20 border border-white/10 rounded-2xl p-4 min-w-[220px]">
                                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Order Details</p>
                                <p className="text-3xl font-black text-white">{order.items?.length || 0} items</p>
                                <p className="text-xs text-gray-400 mt-2">{order.status || "ScheduledForPickup"}</p>
                            </div>
                </div>

                <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
                    <div className="space-y-4">
                        <div className="bg-black/20 border border-white/10 rounded-2xl p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">Items</p>
                            <div className="space-y-2">
                                {order.items?.map((item, idx) => (
                                    <div key={`${item.name}-${idx}`} className="flex items-center justify-between gap-3 text-sm">
                                        <div className="flex items-center gap-3 text-gray-200">
                                            <Shirt size={14} className="text-gray-500" />
                                            <span>{item.name}</span>
                                            {item.steamIron && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
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
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-yellow-300 mb-2">Instructions</p>
                                <p className="text-sm text-yellow-100/90">{order.instructions}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="bg-black/20 border border-white/10 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Reschedule</p>
                                <button
                                    onClick={() => setIsRescheduling((prev) => !prev)}
                                    className="text-xs font-bold text-cyan-300 hover:text-white flex items-center gap-1"
                                >
                                    <RotateCcw size={12} /> {isRescheduling ? "Cancel" : "Edit"}
                                </button>
                            </div>

                            {isRescheduling ? (
                                <div className="space-y-3">
                                    <input
                                        type="date"
                                        value={rescheduleDate}
                                        onChange={(e) => setRescheduleDate(e.target.value)}
                                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50 [color-scheme:dark]"
                                    />
                                    <input
                                        type="text"
                                        value={rescheduleSlot}
                                        onChange={(e) => setRescheduleSlot(e.target.value)}
                                        placeholder="Time slot"
                                        className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50"
                                    />
                                    <button
                                        onClick={handleReschedule}
                                        disabled={isSaving}
                                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save Schedule
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-400">
                                    Current slot: <span className="text-white font-bold">{formatDisplayDate(order.scheduledDate)} · {order.scheduledSlot || "No slot"}</span>
                                </p>
                            )}
                        </div>

                        <div className="bg-black/20 border border-white/10 rounded-2xl p-4 space-y-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Workflow</p>
                            <button
                                onClick={() => updateOrder({
                                    pickedUpFromCustomerAt: serverTimestamp(),
                                }, "Marked as picked up")}
                                disabled={isSaving || !!order.pickedUpFromCustomerAt}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Truck size={16} /> {order.pickedUpFromCustomerAt ? "Picked Up" : "Mark Picked Up"}
                            </button>
                            <button
                                onClick={() => updateOrder({
                                    status: "Delivered",
                                    deliveredToCustomerAt: serverTimestamp(),
                                }, "Marked as delivered")}
                                disabled={isSaving || !order.pickedUpFromCustomerAt || !!order.deliveredToCustomerAt}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <CheckCircle2 size={16} /> {order.deliveredToCustomerAt ? "Delivered" : "Mark Delivered"}
                            </button>
                        </div>

                        <div className="bg-black/20 border border-white/10 rounded-2xl p-4 space-y-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Payments</p>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Customer Paid</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={customerPaidAmount}
                                        onChange={(e) => setCustomerPaidAmount(e.target.value)}
                                        placeholder="₹0"
                                        className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-green-500/50"
                                    />
                                    <button
                                        onClick={handleCustomerPaid}
                                        disabled={isSaving}
                                        className="px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <CreditCard size={14} /> Save
                                    </button>
                                </div>
                                {order.customerPaidAt && (
                                    <p className="text-xs text-green-300">₹{order.customerPaidAmount || 0} recorded on {formatTimestamp(order.customerPaidAt)}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Paid to Shop</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={paidToShopAmount}
                                        onChange={(e) => setPaidToShopAmount(e.target.value)}
                                        placeholder="₹0"
                                        className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-purple-500/50"
                                    />
                                    <button
                                        onClick={handleShopPaid}
                                        disabled={isSaving}
                                        className="px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <CreditCard size={14} /> Save
                                    </button>
                                </div>
                                {order.paidToShopAt && (
                                    <p className="text-xs text-purple-300">₹{order.paidToShopAmount || 0} recorded on {formatTimestamp(order.paidToShopAt)}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
    const [activeTab, setActiveTab] = useState("settings");
    const [ordersSubTab, setOrdersSubTab] = useState("scheduled");

    const filteredOrders = useMemo(() => {
        return laundryOrders.filter((order) => getOrderStage(order) === ordersSubTab);
    }, [laundryOrders, ordersSubTab]);

    const groupedOrders = useMemo(() => {
        return filteredOrders.reduce((acc, order) => {
            const key = order.scheduledDate || "No Date";
            if (!acc[key]) acc[key] = [];
            acc[key].push(order);
            return acc;
        }, {});
    }, [filteredOrders]);

    const subTabCounts = useMemo(() => (
        laundryOrders.reduce((acc, order) => {
            acc[getOrderStage(order)] += 1;
            return acc;
        }, { scheduled: 0, inprogress: 0, completed: 0 })
    ), [laundryOrders]);

    return (
        <div className="space-y-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex gap-2 border-b border-white/10">
                    {ROOT_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id ? "text-white border-cyan-500" : "text-gray-500 border-transparent hover:text-gray-300"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === "settings" && (
                    <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl">
                        <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-6 flex items-center gap-3">
                            <Clock className="text-cyan-500" /> Laundry Timeslots Management
                        </h2>

                        <div className="grid md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {["default", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDay(day)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/5 ${selectedDay === day ? "bg-cyan-500 text-white shadow-lg" : "bg-black/20 text-gray-500 hover:text-white hover:bg-white/10"}`}
                                        >
                                            {day === "default" ? "Default" : day.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-cyan-500/10 p-6 rounded-2xl border border-cyan-500/20 mb-6">
                                    <h4 className="text-xl font-bold text-cyan-400 mb-2">
                                        Managing: <span className="text-white underline decoration-cyan-500/50">{selectedDay === "default" ? "Default Schedule" : selectedDay}</span>
                                    </h4>
                                    <p className="text-cyan-200/70 text-sm">
                                        {selectedDay === "default"
                                            ? "These slots apply to any day that doesn't have specific slots set."
                                            : `Slots added here will OVERRIDE the default schedule for all ${selectedDay}s.`}
                                    </p>
                                </div>

                                <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl">
                                    <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><Clock size={16} /> How it works</h4>
                                    <p className="text-sm text-blue-200/70 leading-relaxed">
                                        Add available pickup time slots for the selected date. These will appear in the Laundry booking form for users.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Available Slots</label>

                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Start</label>
                                            <input
                                                type="time"
                                                value={slotStart}
                                                onChange={(e) => setSlotStart(e.target.value)}
                                                className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50 font-bold [color-scheme:dark]"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">End</label>
                                            <input
                                                type="time"
                                                value={slotEnd}
                                                onChange={(e) => setSlotEnd(e.target.value)}
                                                className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50 font-bold [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleAddSlot}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white p-3.5 rounded-xl transition-colors font-bold shadow-lg shadow-cyan-900/40 h-[50px] w-[50px] flex items-center justify-center"
                                        title="Add Slot"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>

                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {laundrySlots.length === 0 && (
                                        <div className="text-center py-10 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                                            No slots added for this date.
                                        </div>
                                    )}
                                    {laundrySlots.map((slot, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                                            <span className="font-bold text-gray-200">{slot}</span>
                                            <button
                                                onClick={() => {
                                                    setConfirmModal({ isOpen: true, slotIdx: idx, slotName: slot });
                                                }}
                                                className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
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

                {activeTab === "orders" && (
                    <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
                        <div className="mb-6">
                            <h2 className="text-3xl font-black text-white flex items-center gap-3"><Package className="text-cyan-500" /> Laundry Orders</h2>
                            <p className="text-sm text-gray-400 mt-2">Orders are grouped by scheduled pickup date.</p>
                        </div>

                        <div className="flex gap-1 border-b border-white/10 mb-8 overflow-x-auto">
                            {ORDER_SUB_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setOrdersSubTab(tab.id)}
                                    className={`px-5 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${ordersSubTab === tab.id ? "text-white border-cyan-500" : "text-gray-500 border-transparent hover:text-gray-300"}`}
                                >
                                    {tab.label}
                                    {subTabCounts[tab.id] > 0 && (
                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300">
                                            {subTabCounts[tab.id]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {loadingLaundryOrders ? (
                            <div className="flex justify-center items-center h-48 text-gray-500">
                                <Loader2 className="animate-spin mr-2" /> Loading laundry orders...
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <EmptyOrdersState message="No laundry orders in this subtab." />
                        ) : (
                            <div className="space-y-8">
                                {Object.entries(groupedOrders)
                                    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                                    .map(([date, ordersForDate]) => (
                                        <OrderDateGroup
                                            key={date}
                                            title={formatDisplayDate(date)}
                                            orders={ordersForDate}
                                            renderOrder={(order) => <LaundryOrderCard key={order.id} order={order} />}
                                        />
                                    ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={() => handleDeleteSlot(confirmModal.slotIdx)}
                title="Delete Timeslot?"
                message={`Are you sure you want to delete the timeslot "${confirmModal.slotName}"?`}
                confirmLabel="Delete"
            />
        </div>
    );
}
