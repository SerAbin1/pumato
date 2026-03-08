"use client";

import Navbar from "../../components/Navbar";
import { motion } from "framer-motion";
import { ArrowLeft, Shirt } from "lucide-react";
import Link from "next/link";

export default function LaundryTermsPage() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-blue-500 selection:text-white pb-20">
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8 pt-24 relative z-10">
                <Link href="/laundry" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                    <ArrowLeft size={16} /> Back to Laundry
                </Link>

                <div className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 text-blue-500 font-bold tracking-widest uppercase text-xs mb-4"
                    >
                        <Shirt size={16} /> Laundry Service
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black tracking-tight mb-4"
                    >
                        Terms & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Conditions</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg"
                    >
                        Last Updated: March 2024
                    </motion.p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500">
                        <Shirt size={120} />
                    </div>

                    <p className="text-gray-300 leading-relaxed mb-8 font-medium">These Terms & Conditions (&quot;Terms&quot;) govern the use of the PUMATO Laundry Service (&quot;Service&quot;). By placing an order through pumato.online, you (&quot;User&quot; / &quot;Customer&quot;) agree to be bound by these Terms.</p>

                    <div className="space-y-12">
                        <TermBlock title="1. Service Overview">
                            <p>PUMATO Laundry is a pickup and delivery facilitation service operating across multiple campuses and surrounding areas.</p>
                            <p className="mt-4">PUMATO&apos;s responsibility is strictly limited to:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Pickup of laundry from the User</li>
                                <li>Delivery of laundry back to the User</li>
                            </ul>
                            <p className="mt-4">All washing, drying, folding, ironing, stain removal, and garment handling responsibilities are handled entirely by the third-party laundry partner.</p>
                            <p className="mt-2 text-gray-400">PUMATO does not own, operate, or manage any laundry facility.</p>
                        </TermBlock>

                        <TermBlock title="2. Order Placement (Website Only)">
                            <p>All laundry orders must be placed exclusively through PUMATO&apos;s official website:</p>
                            <p className="mt-2 text-blue-400 font-bold">🌐 https://pumato.online</p>
                            <p className="mt-4 text-gray-400">Orders placed through WhatsApp, phone calls, or any unofficial channels will not be accepted.</p>
                        </TermBlock>

                        <TermBlock title="3. Prebooking & Slot Selection">
                            <p>This Service operates on a prebooking basis only.</p>
                            <h4 className="font-bold text-white mt-4 mb-2">Users must:</h4>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li>Select a preferred pickup slot through the website</li>
                                <li>Ensure availability at the selected time for handover</li>
                            </ul>
                            <p className="mt-4 text-gray-400">PUMATO may reschedule pickup/delivery slots due to operational constraints, weather, or high demand.</p>
                        </TermBlock>

                        <TermBlock title="4. Pickup, Weighing & Payment Policy">
                            <p>Laundry will be weighed at the shop using a weighing scale. Photos of weighing will be sent with payment QR.</p>
                            <p className="mt-4">The final payable amount will be calculated based on:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Weight of clothes</li>
                                <li>Selected service options</li>
                                <li>Delivery charges</li>
                            </ul>
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl mt-4">
                                <p className="text-blue-400 font-bold">📌 Payment must be completed immediately after sharing the QR.</p>
                                <p className="text-gray-400 mt-2">Laundry will not be processed without successful payment.</p>
                            </div>
                        </TermBlock>

                        <TermBlock title="5. Pricing & Service Charges">
                            <h4 className="font-bold text-white mb-2">Laundry service charges are as follows:</h4>
                            <ul className="list-disc pl-5 space-y-2 text-gray-400">
                                <li><span className="text-white">Wash + Dry + Fold:</span> ₹79 per kg</li>
                                <li><span className="text-white">Stain Removal:</span> ₹35 per spot</li>
                                <li><span className="text-white">Steam Iron:</span> ₹15 per piece</li>
                            </ul>
                            <p className="mt-4 text-gray-400">📌 Charges are based on actual weight and service selection.</p>
                        </TermBlock>

                        <TermBlock title="6. Delivery Charges">
                            <p>Delivery charges are applicable and may vary depending on:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Total weight of laundry</li>
                                <li>Number of items</li>
                                <li>Pickup/delivery difficulty</li>
                                <li>Distance from service area/campus</li>
                                <li>Operational workload and weather conditions</li>
                            </ul>
                            <p className="mt-4 text-gray-400">The final delivery fee will be communicated during checkout or confirmation.</p>
                        </TermBlock>

                        <TermBlock title="7. Turnaround Time">
                            <p>The standard turnaround time is <strong className="text-white">up to 3 business days</strong> from the time of pickup.</p>
                            <p className="mt-4">However, delivery may be delayed due to:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Heavy order volume</li>
                                <li>Weather conditions</li>
                                <li>Operational issues at the laundry facility</li>
                                <li>Campus restrictions or travel difficulty</li>
                            </ul>
                            <p className="mt-4 text-gray-400">Delivery timelines are estimated and not guaranteed.</p>
                        </TermBlock>

                        <TermBlock title="8. Prohibited Items Policy (Strict Rule)">
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl">
                                <p className="text-red-400 font-bold mb-2">For hygiene and safety reasons, the following items are strictly not accepted:</p>
                                <ul className="list-disc pl-5 space-y-1 text-red-400/80">
                                    <li>⛔ Underwear / Innerwear</li>
                                    <li>⛔ Bras</li>
                                    <li>⛔ Socks</li>
                                    <li>⛔ Towels used for personal hygiene</li>
                                    <li>⛔ Any heavily contaminated clothing</li>
                                </ul>
                                <p className="mt-4 text-sm text-red-400/60 font-medium">If such items are found in the laundry bag, the order may be rejected immediately, OR the prohibited items may be removed and returned without processing. No refund will be provided for delivery charges in such cases.</p>
                            </div>
                        </TermBlock>

                        <TermBlock title="9. Valuable Items Disclaimer">
                            <p>Users must not include any valuables inside the laundry bag, including but not limited to:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Cash</li>
                                <li>Jewellery</li>
                                <li>Watches</li>
                                <li>Earphones / electronics</li>
                                <li>Power banks</li>
                                <li>IDs, ATM cards, passports</li>
                                <li>Keys</li>
                                <li>Belts</li>
                            </ul>
                            <p className="mt-4 text-gray-400">PUMATO is not responsible for any loss of valuables left inside laundry bags.</p>
                        </TermBlock>

                        <TermBlock title="10. Missing Items Policy">
                            <p>Users must hand over laundry securely in a properly packed bag.</p>
                            <p className="mt-4 text-gray-400">PUMATO is not responsible for missing items unless the issue is reported immediately at the time of delivery.</p>
                            <p className="mt-2 text-gray-400">Any complaint regarding missing items raised after delivery completion may not be entertained.</p>
                        </TermBlock>

                        <TermBlock title="11. Quality Responsibility & Laundry Handling">
                            <p>All responsibilities regarding:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Washing quality</li>
                                <li>Fabric damage</li>
                                <li>Color bleeding</li>
                                <li>Shrinkage</li>
                                <li>Missing buttons/tears</li>
                                <li>Ironing quality</li>
                                <li>Stain removal outcome</li>
                            </ul>
                            <p className="mt-4">are the sole responsibility of the third-party laundry partner.</p>
                            <p className="mt-2 text-gray-400">PUMATO does not guarantee stain removal success.</p>
                        </TermBlock>

                        <TermBlock title="12. Refund & Service Issue Policy">
                            <p>If a delay occurs solely due to PUMATO&apos;s fault, a partial or full refund of the <strong className="text-white">delivery fee only</strong> may be issued at PUMATO&apos;s discretion.</p>
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl mt-4">
                                <p className="text-yellow-400">📌 No refund will be provided for laundry charges, as laundry processing is handled by a third-party partner.</p>
                            </div>
                        </TermBlock>

                        <TermBlock title="13. Rider Access Policy">
                            <p>PUMATO delivery partners are not permitted to:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Enter hostel rooms</li>
                                <li>Enter restricted campus zones</li>
                                <li>Access private residential areas</li>
                            </ul>
                            <p className="mt-4 text-gray-400">Users must collect and hand over laundry at the agreed pickup/delivery point.</p>
                            <h4 className="font-bold text-white mt-6 mb-2">Unreachable User</h4>
                            <p className="text-gray-400">If the User is unreachable for 10 minutes during pickup or delivery:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>The pickup/delivery may be marked as failed</li>
                                <li>No refund will be provided for delivery charges</li>
                            </ul>
                        </TermBlock>

                        <TermBlock title="14. User Conduct">
                            <p>Users must treat PUMATO delivery partners (student workers) with respect.</p>
                            <p className="mt-4">Any of the following may result in immediate suspension or permanent restriction:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Abusive language</li>
                                <li>Harassment</li>
                                <li>Threats</li>
                                <li>Refusal to pay after confirmation</li>
                            </ul>
                            <p className="mt-4 text-gray-400">PUMATO prioritizes the safety and dignity of its delivery partners.</p>
                        </TermBlock>

                        <TermBlock title="15. Promotional Offers & Promo Codes">
                            <p>Promo codes are subject to availability and may be limited by:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Quantity</li>
                                <li>Time validity</li>
                                <li>First-come-first-served basis</li>
                            </ul>
                            <p className="mt-4">Users are solely responsible for applying promo codes correctly.</p>
                            <p className="mt-2 text-gray-400">PUMATO is not responsible for:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Leaked promo codes</li>
                                <li>Expired promo codes</li>
                                <li>Promo codes shared publicly by Users</li>
                            </ul>
                            <p className="mt-4 text-gray-400">Any attempt to misuse, tamper, or manipulate promo codes through technical or non-technical methods will result in an immediate and permanent ban.</p>
                        </TermBlock>

                        <TermBlock title="16. Limitation of Liability">
                            <p>To the fullest extent permitted by law, PUMATO shall not be liable for:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Health-related issues or allergic reactions</li>
                                <li>Indirect or consequential losses</li>
                                <li>Disputes between Users and laundry partner</li>
                                <li>Damage caused during washing/ironing/stain removal</li>
                                <li>Missing items reported after delivery completion</li>
                            </ul>
                            <p className="mt-4 text-gray-400">PUMATO&apos;s responsibility is strictly limited to logistics facilitation (pickup and delivery).</p>
                        </TermBlock>

                        <TermBlock title="17. Service Suspension">
                            <p>PUMATO reserves the right, at its sole discretion, to:</p>
                            <ul className="list-disc pl-5 space-y-2 mt-2 text-gray-400">
                                <li>Pause or suspend operations temporarily</li>
                                <li>Refuse service to any User violating these Terms</li>
                                <li>Cancel bookings due to operational constraints</li>
                            </ul>
                        </TermBlock>

                        <TermBlock title="18. Modifications to Terms">
                            <p>PUMATO may update or revise these Terms at any time without prior notice. Continued use of the Service constitutes acceptance of the revised Terms.</p>
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
            <h3 className="text-xl font-bold text-blue-400">{title}</h3>
            <div className="text-gray-300 leading-relaxed text-sm md:text-base">
                {children}
            </div>
        </div>
    );
}