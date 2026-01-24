"use client";

import Navbar from "../../components/Navbar";
import { motion } from "framer-motion";
import { ArrowLeft, ScrollText, Utensils } from "lucide-react";
import Link from "next/link";

export default function DeliveryTermsPage() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-orange-500 selection:text-white pb-20">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8 pt-24 relative z-10">
                <Link href="/delivery" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                    <ArrowLeft size={16} /> Back to Delivery
                </Link>

                <div className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 text-orange-500 font-bold tracking-widest uppercase text-xs mb-4"
                    >
                        <Utensils size={16} /> Food Delivery
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

                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-orange-500">
                        <Utensils size={120} />
                    </div>

                    <p className="text-gray-300 leading-relaxed mb-8 font-medium">Welcome to PUMATO. These Terms and Conditions (“Terms”) govern your access to and use of PUMATO’s food delivery services, operated through WhatsApp, our website, or any future digital platform (collectively, the “Service”).</p>

                    <div className="space-y-12">
                        <TermBlock title="1. About PUMATO">
                            <p>PUMATO is a student-run campus food delivery service operating exclusively within Pondicherry University.</p>
                            <p className="mt-4 italic text-orange-400/80">“To fulfill the daily food needs of the student community, through students themselves.”</p>
                            <h4 className="font-bold text-white mt-6 mb-2">Role of PUMATO</h4>
                            <p>PUMATO acts solely as an intermediary delivery facilitator between Users (“Customers”) and third-party restaurants or food vendors. PUMATO:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Does not prepare, cook, manufacture, or sell food.</li>
                                <li>Is not a restaurant or food provider.</li>
                                <li>Is responsible only for collecting food from vendors and delivering it to the User’s designated campus location.</li>
                            </ul>
                        </TermBlock>

                        <TermBlock title="2. Ordering Process">
                            <h4 className="font-bold text-white mb-2">Order Placement</h4>
                            <p>Orders are accepted only through the official PUMATO WhatsApp number: <a href="https://wa.me/919048086503" className="text-orange-400 hover:underline">https://wa.me/919048086503</a></p>
                            <h4 className="font-bold text-white mt-6 mb-2">Required Information</h4>
                            <p>Users must provide accurate details: Full name, Contact number, Hostel/Department, Room number, Selected restaurant, and a clear list of food items.</p>
                            <h4 className="font-bold text-white mt-6 mb-2">Order Confirmation & Availability</h4>
                            <p>Orders are confirmed only after acknowledgment and sharing of the final payable amount. PUMATO does not guarantee item availability.</p>
                        </TermBlock>

                        <TermBlock title="3. Pricing, Delivery Fees & Payments">
                            <ul className="list-disc pl-5 space-y-3 text-gray-400 font-medium">
                                <li><strong className="text-white">Standard Fee:</strong> ₹30 per order.</li>
                                <li><strong className="text-white">Peak/Complex Orders:</strong> Additional charges (₹10-₹40+) apply for multiple restaurants, peak hours, weather, or complex deliveries.</li>
                                <li><strong className="text-white">Food Pricing:</strong> Set entirely by the restaurant. Final price may differ from menu due to parcel charges (₹5-10) or GST.</li>
                                <li><strong className="text-white">Payments:</strong> Must be completed via UPI before delivery. Proof of payment (screenshot) is required.</li>
                            </ul>
                        </TermBlock>

                        <TermBlock title="4. Delivery Policy">
                            <p>Delivery times are estimated and not guaranteed. Delays may occur due to restaurant preparation, campus traffic, weather, or high volume. Services may be paused during heavy rain or operational rush.</p>
                        </TermBlock>

                        <TermBlock title="5. Cancellations & Refunds">
                            <ul className="list-disc pl-5 space-y-3 text-gray-400">
                                <li><strong className="text-white">User Cancellations:</strong> Not permitted once food preparation has started.</li>
                                <li><strong className="text-white">PUMATO Cancellations:</strong> Refund issued if the restaurant is closed or items are unavailable.</li>
                                <li><strong className="text-white">Service Issues:</strong> Partial/full refund of the delivery fee ONLY if delay is solely PUMATO's fault.</li>
                            </ul>
                        </TermBlock>

                        <TermBlock title="6. Food Quality & Responsibility">
                            <p>Food quality, taste, hygiene, preparation, packaging, and portion size are the sole responsibility of the restaurant. PUMATO is not liable for dissatisfaction but may assist in communication.</p>
                        </TermBlock>

                        <TermBlock title="6A. Item Images & Visual Representation Disclaimer">
                            <p className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-gray-300 italic">
                                Item images displayed on PUMATO platforms may be illustrative or AI-generated. The actual food delivered may differ in appearance, portion, or plating from the displayed image.
                            </p>
                        </TermBlock>

                        <TermBlock title="7. User Conduct">
                            <p>Users must treat student delivery partners with respect. Abuse, harassment, threats, or refusal to pay will result in temporary suspension or permanent restriction.</p>
                        </TermBlock>

                        <TermBlock title="8. Limitation of Liability">
                            <p>PUMATO is not liable for health concerns, indirect losses, or disputes between Users and restaurants. Responsibility is limited to logistics facilitation.</p>
                        </TermBlock>

                        <TermBlock title="9. Rider Access Policy">
                            <p>Delivery partners cannot enter hostel rooms or restricted zones. Users must collect orders at the agreed point. If unreachable for 10 minutes, the order may be marked failed without refund.</p>
                        </TermBlock>

                        <TermBlock title="10. Promotional Offers & Promo Codes">
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>Promo codes are first-come, first-served and may have limits or expiry.</li>
                                <li>User is responsible for applying codes correctly. Leaked or expired codes won't be reissued.</li>
                                <li>Abuse or tampering results in an immediate and permanent ban.</li>
                            </ul>
                        </TermBlock>

                        <TermBlock title="11. Service Suspension">
                            <p>PUMATO reserves the right to pause operations or refuse service to any User violating these Terms.</p>
                        </TermBlock>

                        <TermBlock title="12. Modifications">
                            <p>Terms may be updated at any time without notice. Continued use constitutes acceptance of the revised Terms.</p>
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
            <h3 className="text-xl font-bold text-orange-400">{title}</h3>
            <div className="text-gray-300 leading-relaxed text-sm md:text-base">
                {children}
            </div>
        </div>
    );
}
