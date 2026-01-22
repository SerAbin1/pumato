"use client";

import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import { ArrowLeft, ScrollText } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-orange-500 selection:text-white pb-20">
            {/* Noise Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8 pt-24 relative z-10">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                    <ArrowLeft size={16} /> Back to Home
                </Link>

                <div className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 text-orange-500 font-bold tracking-widest uppercase text-xs mb-4"
                    >
                        <ScrollText size={16} /> Legal
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black tracking-tight mb-4"
                    >
                        Terms & <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">Conditions</span>
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

                <div className="space-y-16">
                    {/* FOOD DELIVERY TERMS */}
                    <section className="space-y-8">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <ScrollText size={120} />
                            </div>
                            <h2 className="text-3xl font-bold mb-6 text-white border-b border-white/10 pb-4">Food Delivery Service Terms</h2>

                            <p className="text-gray-300 leading-relaxed mb-6 font-medium">Welcome to PUMATO. These Terms and Conditions (“Terms”) govern your access to and use of PUMATO’s food delivery services, operated through WhatsApp, our website, or any future digital platform (collectively, the “Service”). By placing an order with PUMATO, you confirm that you have read, understood, and agreed to be bound by these Terms.</p>

                            <div className="space-y-8">
                                <TermBlock title="1. About PUMATO">
                                    <p>PUMATO is a student-run campus food delivery service operating exclusively within Pondicherry University. Our vision is to fulfill the daily food needs of the student community, through students themselves.</p>
                                    <h4 className="font-bold text-white mt-4 mb-2">Role of PUMATO</h4>
                                    <p>PUMATO acts solely as an intermediary delivery facilitator between Users (“Customers”) and third-party restaurants or food vendors. PUMATO:</p>
                                    <ul className="list-disc pl-5 space-y-1 mt-2 text-gray-400">
                                        <li>Does not prepare, cook, manufacture, or sell food.</li>
                                        <li>Is not a restaurant or food provider.</li>
                                        <li>Is responsible only for collecting food from vendors and delivering it to the User’s designated campus location.</li>
                                    </ul>
                                </TermBlock>

                                <TermBlock title="2. Ordering Process">
                                    <h4 className="font-bold text-white mt-2 mb-2">Order Placement</h4>
                                    <p>Orders are accepted only through the official PUMATO WhatsApp number: <a href="https://wa.me/919048086503" className="text-orange-400 hover:underline">https://wa.me/919048086503</a></p>

                                    <h4 className="font-bold text-white mt-4 mb-2">Required Information</h4>
                                    <p>Users must provide accurate details: Full name, Contact number, Hostel/Department, Room number, Selected restaurant, and a clear list of food items.</p>

                                    <h4 className="font-bold text-white mt-4 mb-2">Order Confirmation & Availability</h4>
                                    <p>Orders are confirmed only after acknowledgment and sharing of the payable amount. PUMATO does not guarantee item availability.</p>
                                </TermBlock>

                                <TermBlock title="3. Pricing, Delivery Fees & Payments">
                                    <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                        <li><strong>Standard Fee:</strong> ₹30 per order.</li>
                                        <li><strong>Peak/Complex Orders:</strong> Additional charges (₹10-₹40+) may apply for multiple restaurants, peak hours, heavy weather, or complex deliveries.</li>
                                        <li><strong>Food Pricing:</strong> Set entirely by the restaurant.</li>
                                        <li><strong>Payments:</strong> Must be completed via approved methods (e.g., UPI) before delivery.</li>
                                    </ul>
                                </TermBlock>

                                <TermBlock title="4. Delivery Policy">
                                    <p>All delivery times are estimated. Delays may occur due to restaurant prep time, campus traffic, weather, or high volume. Services may be paused during unsafe conditions.</p>
                                </TermBlock>

                                <TermBlock title="5. Cancellations & Refunds">
                                    <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                        <li><strong>User Cancellations:</strong> Not allowed once preparation starts.</li>
                                        <li><strong>PUMATO Cancellations:</strong> Full refund if the restaurant is closed or items are unavailable.</li>
                                        <li><strong>Service Issues:</strong> Partial/full refund of delivery fee only if delay is solely PUMATO's fault.</li>
                                    </ul>
                                </TermBlock>

                                <TermBlock title="6. Food Quality & Responsibility">
                                    <p>Food quality, taste, hygiene, and packaging are the sole responsibility of the restaurant. PUMATO is not liable for dissatisfaction but may assist in communication.</p>
                                </TermBlock>

                                <TermBlock title="7. User Conduct & Safety">
                                    <p>Users must treat student delivery partners with respect. Abuse, harassment, threats, or non-payment will result in suspension or permanent restriction.</p>
                                </TermBlock>

                                <TermBlock title="8. Limitation of Liability">
                                    <p>PUMATO is not liable for health concerns, indirect losses, or disputes between Users and restaurants. Responsibility is limited to logistics.</p>
                                </TermBlock>

                                <TermBlock title="9. Rider Access Policy">
                                    <p>Delivery partners cannot enter hostels or rooms. Users must collect orders at the agreed point. If unreachable for 10 minutes, the order may be marked failed without refund.</p>
                                </TermBlock>

                                <TermBlock title="10. Service Suspension & Modifications">
                                    <p>PUMATO reserves the right to suspend operations, refuse service, or modify these Terms at any time.</p>
                                </TermBlock>
                            </div>
                        </div>
                    </section>

                    {/* GROCERY TERMS */}
                    <section className="space-y-8">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <ScrollText size={120} />
                            </div>
                            <h2 className="text-3xl font-bold mb-6 text-white border-b border-white/10 pb-4">Grocery Delivery Terms</h2>
                            <p className="text-gray-300 leading-relaxed mb-6 font-medium">These Terms govern the PUMATO Grocery Delivery Service, a student-run personal shopping and campus courier service.</p>

                            <div className="space-y-8">
                                <TermBlock title="1. Service Overview">
                                    <p>PUMATO Grocery involves delivery partners strictly as logistics intermediaries who purchase items on your behalf. We do not stock goods or own stores.</p>
                                </TermBlock>

                                <TermBlock title="2. Prohibited Items (Zero Tolerance)">
                                    <p className="text-red-400 font-bold border border-red-500/30 bg-red-500/10 p-4 rounded-xl">
                                        Strictly Prohibited: Cigarettes, tobacco, alcohol, or illegal substances. Attempting to order these will result in immediate rejection and permanent suspension.
                                    </p>
                                </TermBlock>

                                <TermBlock title="3. Ordering Process">
                                    <p>Orders via WhatsApp only. Users must specify Brand, Quantity, and Size. For vague requests (e.g., "Buy apples"), the rider's judgment is final.</p>
                                </TermBlock>

                                <TermBlock title="4. Pricing">
                                    <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                        <li><strong>Delivery Fee:</strong> ₹30 standard. Variable charges apply for weight, multiple stores, etc.</li>
                                        <li><strong>Item Pricing:</strong> Actual store price/MRP. Users pay Store Bill + Delivery Fee.</li>
                                    </ul>
                                </TermBlock>

                                <TermBlock title="5. Operating Hours">
                                    <p>Weekdays: 4:00 PM – 10:00 PM | Weekends: 10:00 AM – 10:00 PM</p>
                                </TermBlock>

                                <TermBlock title="6. Substitutions & Availability">
                                    <p>If an item is out of stock, riders will attempt contact. No response within 10 mins authorizes the rider to skip or substitute the item.</p>
                                </TermBlock>

                                <TermBlock title="7. Returns & Quality">
                                    <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                        <li><strong>Perishables:</strong> Inspect at delivery. Non-returnable once accepted.</li>
                                        <li><strong>Packaged Goods:</strong> PUMATO is not responsible for internal defects. Returns subject to store policy and additional fee.</li>
                                    </ul>
                                </TermBlock>

                                <TermBlock title="8. Cancellation Policy">
                                    <p>Allowed before purchase. Once purchased, no cancellations; full payment is liable.</p>
                                </TermBlock>

                                <TermBlock title="9. Rider Access & Safety">
                                    <p>Deliveries to main gates only. Unreachable users after 10 mins risk failed delivery without refund. Abusive behavior leads to blacklisting.</p>
                                </TermBlock>
                            </div>
                        </div>
                    </section>
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
            <h3 className="text-xl font-bold text-orange-400">{title}</h3>
            <div className="text-gray-300 leading-relaxed text-sm md:text-base">
                {children}
            </div>
        </div>
    );
}
