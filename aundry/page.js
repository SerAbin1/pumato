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
                <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10">
                    <ArrowLeft size={16} /> Back to Home
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

                    <p className="text-gray-300 leading-relaxed mb-8 font-medium italic text-center py-20">
                        Detailed Terms & Conditions for the PUMATO Laundry service will be released upon service launch.
                    </p>
                </div>

                <div className="mt-12 text-center text-gray-500 text-sm">
                    <p>© {new Date().getFullYear()} PUMATO. All rights reserved.</p>
                </div>
            </div>
        </main>
    );
}

// add the following terms content to the above code in place of the placeholder text AI!:
// similar to the grocery page ai!
PUMATO Laundry – Terms & Conditions

Last Updated: [Insert Date]

These Terms & Conditions (“Terms”) govern the use of the PUMATO Laundry Service (“Service”). By placing an order through pumato.online, you (“User” / “Customer”) agree to be bound by these Terms.

1. Service Overview

PUMATO Laundry is a pickup and delivery facilitation service operating across multiple campuses and surrounding areas.

PUMATO’s responsibility is strictly limited to:

Pickup of laundry from the User

Delivery of laundry back to the User

All washing, drying, folding, ironing, stain removal, and garment handling responsibilities are handled entirely by the third-party laundry partner.

PUMATO does not own, operate, or manage any laundry facility.

2. Order Placement (Website Only)

All laundry orders must be placed exclusively through PUMATO’s official website:

🌐 https://pumato.online

Orders placed through WhatsApp, phone calls, or any unofficial channels will not be accepted.

3. Prebooking & Slot Selection

This Service operates on a prebooking basis only.

Users must:

Select a preferred pickup slot through the website

Ensure availability at the selected time for handover

PUMATO may reschedule pickup/delivery slots due to operational constraints, weather, or high demand.

4. Pickup, Weighing & Payment Policy

Laundry will be weighed at the  shop using a weighing scale. Photos of weighing will be sent with payment qr.

The final payable amount will be calculated based on:

Weight of clothes

Selected service options

Delivery charges

📌 Payment must be completed immediately after sharing the qr.
Laundry will not be processed without successful payment.

5. Pricing & Service Charges

Laundry service charges are as follows:

Wash + Dry + Fold: ₹79 per kg

Stain Removal: ₹35 per spot

Steam Iron: ₹15 per piece

📌 Charges are based on actual weight and service selection.

6. Delivery Charges

Delivery charges are applicable and may vary depending on:

Total weight of laundry

Number of items

Pickup/delivery difficulty

Distance from service area/campus

Operational workload and weather conditions

The final delivery fee will be communicated during checkout or confirmation.

7. Turnaround Time

The standard turnaround time is up to 3 bussiness days from the time of pickup.

However, delivery may be delayed due to:

Heavy order volume

Weather conditions

Operational issues at the laundry facility

Campus restrictions or travel difficulty

Delivery timelines are estimated and not guaranteed.

8. Prohibited Items Policy (Strict Rule)

For hygiene and safety reasons, the following items are strictly not accepted:

⛔ Underwear / Innerwear
⛔ Bras
⛔ Socks
⛔ Towels used for personal hygiene
⛔ Any heavily contaminated clothing

If such items are found in the laundry bag:

The order may be rejected immediately, OR

The prohibited items may be removed and returned without processing

No refund will be provided for delivery charges in such cases.

9. Valuable Items Disclaimer

Users must not include any valuables inside the laundry bag, including but not limited to:

Cash

Jewellery

Watches

Earphones / electronics

Power banks

IDs, ATM cards, passports

Keys

Belts

PUMATO is not responsible for any loss of valuables left inside laundry bags.

10. Missing Items Policy

Users must hand over laundry securely in a properly packed bag.

PUMATO is not responsible for missing items unless the issue is reported immediately at the time of delivery.

Any complaint regarding missing items raised after delivery completion may not be entertained.

11. Quality Responsibility & Laundry Handling

All responsibilities regarding:

Washing quality

Fabric damage

Color bleeding

Shrinkage

Missing buttons/tears

Ironing quality

Stain removal outcome

are the sole responsibility of the third-party laundry partner.

PUMATO does not guarantee stain removal success.

12. Refund & Service Issue Policy

If a delay occurs solely due to PUMATO’s fault, a partial or full refund of the delivery fee only may be issued at PUMATO’s discretion.

📌 No refund will be provided for laundry charges, as laundry processing is handled by a third-party partner.

13. Rider Access Policy

PUMATO delivery partners are not permitted to:

Enter hostel rooms

Enter restricted campus zones

Access private residential areas

Users must collect and hand over laundry at the agreed pickup/delivery point.

Unreachable User

If the User is unreachable for 10 minutes during pickup or delivery:

The pickup/delivery may be marked as failed

No refund will be provided for delivery charges

14. User Conduct

Users must treat PUMATO delivery partners (student workers) with respect.

Any of the following may result in immediate suspension or permanent restriction:

Abusive language

Harassment

Threats

Refusal to pay after confirmation

PUMATO prioritizes the safety and dignity of its delivery partners.

15. Promotional Offers & Promo Codes

Promo codes are subject to availability and may be limited by:

Quantity

Time validity

First-come-first-served basis

Users are solely responsible for applying promo codes correctly.

PUMATO is not responsible for:

Leaked promo codes

Expired promo codes

Promo codes shared publicly by Users

Any attempt to misuse, tamper, or manipulate promo codes through technical or non-technical methods will result in an immediate and permanent ban.

16. Limitation of Liability

To the fullest extent permitted by law, PUMATO shall not be liable for:

Health-related issues or allergic reactions

Indirect or consequential losses

Disputes between Users and laundry partner

Damage caused during washing/ironing/stain removal

Missing items reported after delivery completion

PUMATO’s responsibility is strictly limited to logistics facilitation (pickup and delivery).

17. Service Suspension

PUMATO reserves the right, at its sole discretion, to:

Pause or suspend operations temporarily

Refuse service to any User violating these Terms

Cancel bookings due to operational constraints

18. Modifications to Terms

PUMATO may update or revise these Terms at any time without prior notice. Continued use of the Service constitutes acceptance of the revised Terms.
