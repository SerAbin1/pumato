"use client";

import Navbar from "../../components/Navbar";
import { motion } from "framer-motion";
import { ArrowLeft, ScrollText, ShoppingBasket } from "lucide-react";
import Link from "next/link";

export default function GroceryTermsPage() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-green-500 selection:text-white pb-20">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8 pt-24 relative z-10">
                <Link href="/grocery" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                    <ArrowLeft size={16} /> Back to Grocery
                </Link>

                <div className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 text-green-500 font-bold tracking-widest uppercase text-xs mb-4"
                    >
                        <ShoppingBasket size={16} /> Grocery Service
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black tracking-tight mb-4"
                    >
                        Terms & <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Conditions</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg"
                    >
                        Last Updated: January 2026
                    </motion.p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-green-500">
                        <ShoppingBasket size={120} />
                    </div>

                    <p className="text-gray-300 leading-relaxed mb-8 font-medium">These Terms and Conditions (“Terms”) govern the use of the PUMATO Grocery Delivery Service (“Service”). By placing an order through PUMATO, you (“User” or “Customer”) agree to be bound by these Terms.</p>

                    <div className="space-y-12">
                        <TermBlock title="1. Service Overview">
                            <p>PUMATO Grocery is a student-run personal shopping and campus delivery service operating exclusively within Pondicherry University. We act strictly as a logistics and procurement intermediary, visiting third-party stores on your behalf.</p>
                            <ul className="list-disc pl-5 space-y-2 mt-4 text-gray-400">
                                <li>Does not own or operate any store.</li>
                                <li>Does not manufacture, stock, or sell goods.</li>
                            </ul>
                        </TermBlock>

                        <TermBlock title="2. Prohibited Items (Zero Tolerance Policy)">
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
                                <p className="text-red-400 font-bold mb-2">The following items are strictly prohibited:</p>
                                <ul className="list-disc pl-5 space-y-1 text-red-400/80">
                                    <li>Cigarettes, bidis, vapes, or tobacco products</li>
                                    <li>Alcohol in any form</li>
                                    <li>Illegal, banned, or intoxicating substances</li>
                                </ul>
                                <p className="mt-4 text-sm text-red-400/60 font-medium">Any attempt to order prohibited items will result in immediate rejection and permanent suspension.</p>
                            </div>
                        </TermBlock>

                        <TermBlock title="3. Ordering Process">
                            <h4 className="font-bold text-white mb-2">Order Placement</h4>
                            <p>Orders must be placed exclusively through PUMATO's official WhatsApp: <a href="https://wa.me/919048086503" className="text-green-400 hover:underline">wa.me/919048086503</a></p>
                            <h4 className="font-bold text-white mt-6 mb-2">Accuracy Requirements</h4>
                            <p>Users must clearly specify Brand, Quantity, and Size/Variant. For vague requests (e.g., "Buy apples"), the delivery partner is authorized to use reasonable judgment, and the User agrees to accept and pay for the selected item.</p>
                        </TermBlock>

                        <TermBlock title="4. Pricing & Payments">
                            <h4 className="font-bold text-white mb-2">Delivery Fees</h4>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>Standard fee: ₹30 per order.</li>
                                <li>Variable charges may apply based on weight, number of items, multiple stores, or peak hours (noon/rush).</li>
                            </ul>
                            <h4 className="font-bold text-white mt-6 mb-2">Item Pricing</h4>
                            <p>Users pay the actual store price / MRP as reflected on the purchase bill. <br /> <strong className="text-white">Total Payable = Store Bill + Delivery Fee</strong></p>
                            <h4 className="font-bold text-white mt-6 mb-2">Payment Policy</h4>
                            <p>Payment must be completed before delivery. Proof of payment (screenshot) is required. PUMATO is not liable for third-party payment delays.</p>
                        </TermBlock>

                        <TermBlock title="5. Grocery Operating Hours">
                            <ul className="list-disc pl-5 space-y-1 text-gray-400 font-medium">
                                <li><span className="text-white">Weekdays (Mon–Fri):</span> 4:00 PM – 10:00 PM</li>
                                <li><span className="text-white">Weekends & Holidays:</span> 10:00 AM – 10:00 PM</li>
                            </ul>
                        </TermBlock>

                        <TermBlock title="6. Substitutions & Availability">
                            <p>If an item is unavailable, the rider will attempt contact via WhatsApp. If no response is received within 10 minutes, the rider may skip the item or purchase a reasonable alternative.</p>
                        </TermBlock>

                        <TermBlock title="7. Returns & Quality Policy">
                            <h4 className="font-bold text-white mb-2">Perishables</h4>
                            <p>Must be inspected at delivery point. Non-returnable once accepted. Any damage must be reported before acceptance.</p>
                            <h4 className="font-bold text-white mt-6 mb-2">Packaged Goods</h4>
                            <p>PUMATO is not responsible for internal manufacturing defects. Returns are subject to the original store's policy and incurred service fees.</p>
                        </TermBlock>

                        <TermBlock title="8. Cancellation Policy">
                            <p>Orders may be cancelled without penalty BEFORE items are purchased. Once purchased, cancellation is not permitted and the User is liable for the full amount.</p>
                        </TermBlock>

                        <TermBlock title="9. Delivery Access">
                            <p>Deliveries are made to hostel gates, department entrances, or designated access points only. Riders cannot enter rooms or restricted zones. If unreachable for 10 minutes, the delivery is marked failed without refund.</p>
                        </TermBlock>

                        <TermBlock title="10. User Conduct & Safety">
                            <p>Users must treat PUMATO partners with respect. Abusive language, harassment, or refusal to pay will result in immediate suspension or permanent blacklisting. Violations may be reported to University authorities.</p>
                        </TermBlock>

                        <TermBlock title="11. Promo Codes & Offers">
                            <p>Promo codes are first-come, first-served and may have limits or expiry. Any attempt to abuse or tamper with codes results in immediate suspension or permanent ban.</p>
                        </TermBlock>

                        <TermBlock title="12. Service Suspension & Termination">
                            <p>PUMATO reserves the right to pause services, refuse service, or modify the Service without notice.</p>
                        </TermBlock>

                        <TermBlock title="13. Limitation of Liability">
                            <p>PUMATO is not liable for product quality, store availability, health consequences (allergic reactions), or delays due to weather/crowding. Liability is limited to procurement and logistics facilitation.</p>
                        </TermBlock>

                        <TermBlock title="14. Modifications">
                            <p>Continued use of the Service after update constitutes acceptance of the revised Terms.</p>
                        </TermBlock>
                    </div>
                </div>

                <div className="mt-12 text-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} PUMATO. All rights reserved.</p>
                </div>
            </div>
        </main>
    );
}

function TermBlock({ title, children }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xl font-bold text-green-400">{title}</h3>
            <div className="text-gray-300 leading-relaxed text-sm md:text-base">
                {children}
            </div>
        </div>
    );
}
