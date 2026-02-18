"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Send, Trash2, MapPin, User, Phone, Check, Tag, Loader2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatWhatsAppMessage } from "@/lib/whatsapp";
import { useEffect, useState } from "react";
import Image from "next/image";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { getISTTime, checkManualOverride } from "@/lib/dateUtils";

const format12h = (time24) => {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
};

export default function CartDrawer() {
    const {
        isCartOpen,
        setIsCartOpen,
        cartItems,
        updateQuantity,
        removeFromCart,
        userDetails,
        setUserDetails,
        itemTotal,
        deliveryCharge,
        finalTotal,
        totalItems,
        couponCode,
        discount,
        availableCoupons,
        activeCoupon,
        isMultiRestaurant,
        orderSettings,
        applyCoupon,
        removeCoupon,
        paymentQR,
        foodDeliveryNumber,
        upiId,
        googleSheetUrl,
        minOrderShortfalls,
        campusConfig,
        campusDeliveryCharge,
        hasHeavyItems
    } = useCart();

    const hasMinOrderIssue = minOrderShortfalls && minOrderShortfalls.length > 0;

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [inputCode, setInputCode] = useState("");
    const [couponMsg, setCouponMsg] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const [checkoutError, setCheckoutError] = useState(null);

    const [isStoreOpen, setIsStoreOpen] = useState(true);

    // Reset checkout state when closing cart
    useEffect(() => {
        if (!isCartOpen) {
            setIsCheckingOut(false);
            setCouponMsg(null);
            setInputCode("");
            setCheckoutError(null);
        } else {
            // Check time when cart opens

            // 1. Check Manual Override
            const overrideStatus = checkManualOverride(orderSettings);
            if (overrideStatus !== null) {
                setIsStoreOpen(overrideStatus === 'open');
                return;
            }

            // 2. Fallback to Slot Check
            const { timeInMinutes } = getISTTime();

            const slots = orderSettings.slots || [];
            const isOpen = slots.some(slot => {
                const [startH, startM] = (slot.start || "00:00").split(":").map(Number);
                const [endH, endM] = (slot.end || "23:59").split(":").map(Number);
                const START = startH * 60 + startM;
                const END = endH * 60 + endM;
                return timeInMinutes >= START && timeInMinutes <= END;
            });

            setIsStoreOpen(isOpen);
        }
    }, [isCartOpen, orderSettings]);

    const handleApplyCoupon = async () => {
        if (!inputCode.trim()) return;
        setIsApplying(true);
        setCouponMsg(null);

        // Network verification
        const result = await applyCoupon(inputCode);
        setCouponMsg(result);
        setIsApplying(false);
        if (result.success) setInputCode("");
    };

    const handleCheckout = async () => {
        const trimmedName = userDetails.name.trim();
        const trimmedAddress = userDetails.address.trim();
        if (!trimmedName || !userDetails.phone || !userDetails.campus || !trimmedAddress) {
            setCheckoutError("Please fill in all details including Campus and Hostel.");
            return;
        }

        if (userDetails.phone.length !== 10) {
            setCheckoutError("Please enter a valid 10-digit phone number.");
            return;
        }

        setIsCheckingOut(true);
        setCheckoutError(null);

        try {
            // If coupon is applied, validate with cloud function first
            if (couponCode) {
                const { data, error: funcError } = await supabase.functions.invoke("checkout-coupon", {
                    body: { couponCode }
                });

                if (funcError) throw funcError;
                if (data?.error) {
                    const error = new Error(data.message);
                    error.code = data.error; // e.g. 'resource-exhausted'
                    throw error;
                }
            }

            // Coupon validated (or no coupon), proceed

            // Log order to Google Sheet (fire and forget)
            if (googleSheetUrl) {
                const orderData = {
                    name: userDetails.name,
                    phone: userDetails.phone,
                    campus: userDetails.campus || "",
                    address: userDetails.address,
                    instructions: userDetails.instructions || "",
                    items: cartItems.map(item => `${item.name} x${item.quantity} (${item.restaurantName})`).join(", "),
                    itemTotal,
                    deliveryCharge,
                    discount: discount || 0,
                    couponCode: couponCode || "",
                    finalTotal
                };
                fetch(googleSheetUrl, {
                    redirect: "follow",
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(orderData)
                }).catch(err => console.error("Sheet log error:", err));
            }

            // Open WhatsApp FIRST — must be synchronous in click handler for iOS Safari
            const message = formatWhatsAppMessage(cartItems, userDetails, { itemTotal, deliveryCharge, finalTotal, discount, couponCode, paymentQR, upiId });
            const whatsappUrl = `https://wa.me/${foodDeliveryNumber}?text=${message}`;
            window.open(whatsappUrl, "_blank");
            setIsCartOpen(false);

            // --- FIREBASE ORDER NOTIFICATION (fire-and-forget) ---
            try {
                const uniqueRestaurantIds = [...new Set(cartItems.map(item => item.restaurantId).filter(Boolean))];

                addDoc(collection(db, "orders"), {
                    ...userDetails,
                    items: cartItems.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        restaurantId: item.restaurantId,
                        restaurantName: item.restaurantName
                    })),
                    restaurantIds: uniqueRestaurantIds,
                    status: "placed",
                    finalTotal: finalTotal,
                    createdAt: serverTimestamp()
                });
            } catch (dbError) {
                console.error("Failed to record order in Firestore:", dbError);
            }
        } catch (error) {
            console.error("Checkout error:", error);
            if (error.code === "resource-exhausted" || error.message?.includes("limit reached")) {
                setCheckoutError("Coupon usage limit reached. Please remove it to proceed.");
                removeCoupon();
            } else if (error.code === "not-found" || error.message?.includes("Invalid")) {
                setCheckoutError("Invalid coupon. Please remove it to proceed.");
                removeCoupon();
            } else {
                setCheckoutError("Something went wrong. Please try again.");
            }
        } finally {
            setIsCheckingOut(false);
        }
    };

    const isFormValid = userDetails.name?.trim() && userDetails.phone?.length === 10 && userDetails.campus && userDetails.address?.trim();

    return (
        <AnimatePresence mode="wait">
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                        className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-zinc-900 z-[70] shadow-2xl flex flex-col font-sans border-l border-white/10"
                    >
                        {/* Header */}
                        <div className="px-6 py-5 bg-zinc-900 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 shadow-lg shadow-black/20">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    Your Order
                                    <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full font-bold border border-orange-500/30">
                                        {totalItems} items
                                    </span>
                                </h2>
                                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mt-0.5">Pumato Delivery</p>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content Scroll Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {cartItems.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-gray-600 mb-2 border border-white/5">
                                        <ShoppingBag size={48} />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-xl font-bold text-white">Your cart is empty</h3>
                                        <p className="text-gray-500 max-w-xs mx-auto">Looks like you haven't added anything to your cart yet.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-gray-200 hover:scale-105 transition-all shadow-lg"
                                    >
                                        Start Ordering
                                    </button>
                                </div>
                            ) : (
                                <div className="p-6 space-y-8">

                                    {/* Items List */}
                                    <div className="space-y-4">
                                        {cartItems.map((item) => (
                                            <motion.div
                                                layout
                                                key={item.id}
                                                className="bg-white/5 p-4 rounded-2xl border border-white/5 shadow-sm flex gap-4 group hover:bg-white/10 transition-colors"
                                            >
                                                {item.image && (
                                                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-black/50 border border-white/10 relative">
                                                        <Image
                                                            src={item.image}
                                                            alt={item.name}
                                                            fill
                                                            sizes="80px"
                                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex-1 flex flex-col justify-between py-0.5">
                                                    <div>
                                                        <div className="flex justify-between items-start gap-2">
                                                            <h4 className="font-bold text-white leading-tight line-clamp-2 text-sm md:text-base">{item.name}</h4>
                                                            <p className="font-bold text-white whitespace-nowrap">₹{item.price * item.quantity}</p>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1">₹{item.price} per item</p>
                                                    </div>

                                                    <div className="flex justify-between items-end mt-2">
                                                        <div className="flex items-center gap-3 bg-black/30 rounded-lg p-1 border border-white/10">
                                                            <button
                                                                onClick={() => updateQuantity(item.id, -1)}
                                                                className="w-7 h-7 rounded-md bg-white/10 border border-transparent flex items-center justify-center text-white hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                            <span className="font-bold text-sm w-4 text-center text-white">{item.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(item.id, 1)}
                                                                className="w-7 h-7 rounded-md bg-white/10 border border-transparent flex items-center justify-center text-white hover:bg-green-500/20 hover:text-green-400 transition-colors"
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Coupon Section */}
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider pl-1">Coupon Code</h3>

                                        {!couponCode ? (
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex gap-2 focus-within:bg-white/10 transition-all shadow-sm">
                                                <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center text-gray-500 shrink-0">
                                                    <Tag size={18} />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Enter promo code"
                                                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-white placeholder-gray-600 uppercase"
                                                    value={inputCode}
                                                    onChange={(e) => setInputCode(e.target.value)}
                                                />
                                                <button
                                                    onClick={handleApplyCoupon}
                                                    disabled={!inputCode || isApplying}
                                                    className="px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200 disabled:bg-white/10 disabled:text-gray-500 transition-colors min-w-[80px]"
                                                >
                                                    {isApplying ? "..." : "APPLY"}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                                        <Check size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-green-400 text-sm">{couponCode} APPLIED</p>
                                                        <p className="text-xs text-green-500/80">You saved ₹{discount}!</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={removeCoupon}
                                                    className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline px-2"
                                                >
                                                    REMOVE
                                                </button>
                                            </div>
                                        )}

                                        {/* Coupon Feedback Message */}
                                        {couponCode && activeCoupon && (
                                            <div className="mt-2 px-1">
                                                {activeCoupon.item_id && (
                                                    <div className="space-y-1">
                                                        {(() => {
                                                            const targetItem = cartItems.find(i => i.id === activeCoupon.item_id);
                                                            const qty = targetItem?.quantity || 0;
                                                            const itemName = targetItem?.name || "the target item";

                                                            if (activeCoupon.type === "BOGO") {
                                                                if (qty === 0) return <p className="text-[10px] text-orange-400 font-bold flex items-center gap-1"><Plus size={10} /> Add {itemName} to get 1 FREE!</p>;
                                                                if (qty % 2 !== 0) return <p className="text-[10px] text-orange-400 font-bold flex items-center gap-1"><Plus size={10} /> Add one more {itemName} for a FREE unit!</p>;
                                                                return <p className="text-[10px] text-green-400 font-bold flex items-center gap-1"><Check size={10} /> {Math.floor(qty / 2)} Free {itemName} Applied!</p>;
                                                            } else {
                                                                if (qty === 0) return <p className="text-[10px] text-orange-400 font-bold flex items-center gap-1"><Plus size={10} /> Add {itemName} to apply discount!</p>;
                                                                return <p className="text-[10px] text-green-400 font-bold flex items-center gap-1"><Check size={10} /> Discount applied to {itemName}!</p>;
                                                            }
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {couponMsg && !couponCode && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`text-xs px-2 font-medium ${couponMsg.success ? 'text-green-400' : 'text-red-400'}`}
                                            >
                                                {couponMsg.message}
                                            </motion.p>
                                        )}

                                        {!couponCode && availableCoupons.some(c => c.isVisible) && (
                                            <div className="flex gap-2 px-1 overflow-x-auto pb-1 scrollbar-hide">
                                                {availableCoupons.filter(c => c.isVisible).map(c => (
                                                    <button
                                                        key={c.code}
                                                        onClick={() => { setInputCode(c.code); handleApplyCoupon(); }}
                                                        className="text-[10px] border border-white/10 bg-white/5 text-gray-400 px-2 py-1 rounded-md font-bold whitespace-nowrap hover:bg-white/10 hover:text-white uppercase transition-colors"
                                                    >
                                                        {c.code}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>


                                    {/* Bill Details */}
                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 shadow-sm space-y-3">
                                        <h3 className="font-bold text-gray-400 mb-4 text-xs uppercase tracking-wider">Bill Summary</h3>

                                        <div className="flex justify-between text-sm text-gray-400">
                                            <span>Item Total</span>
                                            <span className="font-medium text-white">₹{itemTotal}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-gray-400">
                                            <span className="flex items-center gap-1">Delivery Charge <span className="text-xs bg-white/10 text-gray-500 px-1 rounded">Info</span></span>
                                            {userDetails.campus ? (
                                                <span className="font-medium text-white">₹{deliveryCharge}</span>
                                            ) : (
                                                <span className="font-medium text-orange-400 text-xs">Select Campus</span>
                                            )}
                                        </div>

                                        {isMultiRestaurant && (
                                            <div className="flex justify-between text-xs text-orange-400 bg-orange-500/10 p-2 rounded-lg border border-orange-500/10">
                                                <span>Multiple Restaurants Surcharge</span>
                                                <span>Applied</span>
                                            </div>
                                        )}
                                        {discount > 0 && (
                                            <div className="flex justify-between text-sm text-green-400 font-medium">
                                                <span>Discount ({couponCode})</span>
                                                <span>- ₹{discount}</span>
                                            </div>
                                        )}
                                        {totalItems > 3 && (
                                            <div className="flex justify-between text-xs text-orange-400 bg-orange-500/10 p-2 rounded-lg border border-orange-500/10">
                                                <span>Large Order Surcharge</span>
                                                <span>Applied</span>
                                            </div>
                                        )}
                                        {hasHeavyItems && (
                                            <div className="flex justify-between text-xs text-orange-400 bg-orange-500/10 p-2 rounded-lg border border-orange-500/10">
                                                <span>Heavy Item Surcharge</span>
                                                <span>Applied</span>
                                            </div>
                                        )}

                                        <div className="border-t border-dashed border-white/10 my-2 pt-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-white text-lg">To Pay</span>
                                                <span className="font-black text-white text-xl">₹{finalTotal}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delivery Details Input */}
                                    <div className="space-y-4">
                                        <h3 className="font-bold text-gray-400 text-xs uppercase tracking-wider pl-1">Delivery Details</h3>

                                        <div className="space-y-3">
                                            <div className="relative group">
                                                <User className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                                                <input
                                                    type="text"
                                                    placeholder="Your Name"
                                                    value={userDetails.name}
                                                    onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium text-white placeholder-gray-600"
                                                />
                                            </div>

                                            <div className="relative group">
                                                <Phone className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                                                <input
                                                    type="tel"
                                                    placeholder="Phone Number"
                                                    maxLength={10}
                                                    value={userDetails.phone}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setUserDetails({ ...userDetails, phone: val });
                                                    }}
                                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium text-white placeholder-gray-600"
                                                />
                                            </div>

                                            <div className="relative group">
                                                <textarea
                                                    placeholder="Custom Instructions (e.g. Biryani should be spicy)"
                                                    value={userDetails.instructions || ""}
                                                    onChange={(e) => setUserDetails({ ...userDetails, instructions: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium text-white placeholder-gray-600 h-20 resize-none text-sm"
                                                />
                                            </div>

                                            {/* Campus Selection */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1 mb-2 block">Campus</label>
                                                <div className="flex gap-2">
                                                    {campusConfig.map((campus) => (
                                                        <button
                                                            key={campus.id}
                                                            type="button"
                                                            onClick={() => setUserDetails({ ...userDetails, campus: campus.name })}
                                                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${userDetails.campus === campus.name
                                                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                                }`}
                                                        >
                                                            {campus.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="relative group">
                                                <MapPin className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                                                <textarea
                                                    placeholder="Hostel"
                                                    value={userDetails.address}
                                                    onChange={(e) => setUserDetails({ ...userDetails, address: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium text-white placeholder-gray-600 h-24 resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-20"></div> {/* Spacer for sticky footer */}
                                </div>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        {cartItems.length > 0 && (
                            <div className="p-6 bg-zinc-900 border-t border-white/5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)] z-20 sticky bottom-0">
                                {orderSettings.slots && orderSettings.slots.length > 0 && !isStoreOpen && (
                                    <div className="mb-3 text-center">
                                        <div className="text-xs text-red-400 bg-red-500/10 px-4 py-2 rounded-2xl border border-red-500/20 font-bold space-y-1">
                                            <p className="uppercase tracking-widest text-[10px] opacity-70 mb-1">Store Currently Closed</p>
                                            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                                                {orderSettings.slots.map((slot, i) => (
                                                    <span key={i} className="whitespace-nowrap">Slot {i + 1}: {format12h(slot.start)} - {format12h(slot.end)}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {!isFormValid && isStoreOpen && (
                                    <div className="mb-3 text-center">
                                        <span className="text-xs text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full animate-pulse border border-orange-500/20">
                                            ⚠️ Please fill details to continue
                                        </span>
                                    </div>
                                )}
                                {checkoutError && (
                                    <div className="mb-3 text-center">
                                        <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 font-bold">
                                            ⚠️ {checkoutError}
                                        </span>
                                    </div>
                                )}
                                {hasMinOrderIssue && isStoreOpen && (
                                    <div className="mb-3 space-y-2">
                                        {minOrderShortfalls.map((item) => (
                                            <div key={item.restaurantId} className="text-xs text-orange-400 bg-orange-500/10 px-4 py-2 rounded-lg border border-orange-500/20 font-bold text-center">
                                                🛍️ Add ₹{item.shortfall} more from <span className="text-white">{item.restaurantName}</span>
                                                <span className="text-gray-500 ml-1">(Min: ₹{item.minAmount})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button
                                    id="checkout-btn"
                                    onClick={handleCheckout}
                                    disabled={!isFormValid || !isStoreOpen || isCheckingOut || hasMinOrderIssue}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-900/20 active:scale-[0.98] border border-white/5"
                                >
                                    {isCheckingOut ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Place Order via WhatsApp</span>
                                            <Send size={20} className={isFormValid ? "animate-bounce-x" : ""} />
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
