"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Send, CreditCard, ChevronRight, Trash2, MapPin, User, Phone, Check, Tag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatWhatsAppMessage, FOOD_DELIVERY_NUMBER } from "@/lib/whatsapp";
import { useEffect, useState } from "react";

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
        applyCoupon,
        removeCoupon,
        availableCoupons,
        isMultiRestaurant
    } = useCart();

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [inputCode, setInputCode] = useState("");
    const [couponMsg, setCouponMsg] = useState(null);
    const [isApplying, setIsApplying] = useState(false);

    const [isStoreOpen, setIsStoreOpen] = useState(true);

    // Reset checkout state when closing cart
    useEffect(() => {
        if (!isCartOpen) {
            setIsCheckingOut(false);
            setCouponMsg(null);
            setInputCode("");
        } else {
            // Check time when cart opens
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const timeInMinutes = hours * 60 + minutes;

            const START_TIME = 18 * 60 + 30; // 6:30 PM
            const END_TIME = 23 * 60; // 11:00 PM

            if (timeInMinutes >= START_TIME && timeInMinutes <= END_TIME) {
                setIsStoreOpen(true);
            } else {
                setIsStoreOpen(false);
            }
        }
    }, [isCartOpen]);

    const handleApplyCoupon = async () => {
        if (!inputCode.trim()) return;
        setIsApplying(true);
        setCouponMsg(null);

        // Simulate network delay for effect
        setTimeout(() => {
            const result = applyCoupon(inputCode);
            setCouponMsg(result);
            setIsApplying(false);
            if (result.success) setInputCode("");
        }, 600);
    };

    const handleCheckout = () => {
        if (!userDetails.name || !userDetails.phone || !userDetails.address) {
            return;
        }

        const button = document.getElementById("checkout-btn");
        if (button) {
            button.innerHTML = "Opening WhatsApp...";
            button.style.opacity = "0.8";
        }

        setTimeout(() => {
            const message = formatWhatsAppMessage(cartItems, userDetails, { itemTotal, deliveryCharge, finalTotal, discount, couponCode });
            const whatsappUrl = `https://wa.me/${FOOD_DELIVERY_NUMBER}?text=${message}`;
            window.open(whatsappUrl, "_blank");

            if (button) {
                button.innerHTML = "Order Placed";
                setIsCartOpen(false);
            }
        }, 800);
    };

    const isFormValid = userDetails.name && userDetails.phone && userDetails.address;

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
                                                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-black/50 border border-white/10">
                                                        <img
                                                            src={item.image}
                                                            alt={item.name}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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
                                        {couponMsg && (
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
                                            <span className="font-medium text-white">₹{deliveryCharge}</span>
                                        </div>
                                        {isMultiRestaurant && (
                                            <div className="flex justify-between text-xs text-orange-400 bg-orange-500/10 p-2 rounded-lg border border-orange-500/10">
                                                <span>Multiple Restaurants</span>
                                                <span>₹40 standard charge</span>
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
                                                    value={userDetails.phone}
                                                    onChange={(e) => setUserDetails({ ...userDetails, phone: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-orange-500/50 focus:bg-white/10 transition-all font-medium text-white placeholder-gray-600"
                                                />
                                            </div>

                                            <div className="relative group">
                                                <MapPin className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                                                <textarea
                                                    placeholder="Room No, Hostel Block..."
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
                                {!isStoreOpen && (
                                    <div className="mb-3 text-center">
                                        <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 font-bold">
                                            ⚠️ Ordering available 6:30 PM - 11:00 PM
                                        </span>
                                    </div>
                                )}
                                {!isFormValid && isStoreOpen && (
                                    <div className="mb-3 text-center">
                                        <span className="text-xs text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full animate-pulse border border-orange-500/20">
                                            ⚠️ Please fill details to continue
                                        </span>
                                    </div>
                                )}
                                <button
                                    id="checkout-btn"
                                    onClick={handleCheckout}
                                    disabled={!isFormValid || !isStoreOpen}
                                    className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-900/20 active:scale-[0.98] border border-white/5"
                                >
                                    <span>Place Order via WhatsApp</span>
                                    <Send size={20} className={isFormValid ? "animate-bounce-x" : ""} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
