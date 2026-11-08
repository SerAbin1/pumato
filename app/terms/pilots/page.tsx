"use client";

import type { ReactNode } from "react";

import Navbar from "../../components/Navbar";
import { motion } from "framer-motion";
import { ArrowLeft, Bike } from "lucide-react";
import Link from "next/link";

const YEAR = new Date().getFullYear();

export default function PilotsTermsPage() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-orange-500 selection:text-white pb-20">
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            ></div>

            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-8 pt-24 relative z-10">
                <Link
                    href="/rides"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-bold bg-white/5 px-4 py-2 rounded-full border border-white/10 hover:bg-white/10"
                >
                    <ArrowLeft size={16} /> Back to Rides
                </Link>

                <div className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 text-orange-500 font-bold tracking-widest uppercase text-xs mb-4"
                    >
                        <Bike size={16} /> Pilot Terms
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black tracking-tight mb-4"
                    >
                        Terms &{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
                            Conditions
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 text-lg"
                    >
                        Last Updated: November 2026
                    </motion.p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-orange-500">
                        <Bike size={120} />
                    </div>

                    <p className="text-gray-300 leading-relaxed mb-8 font-medium">
                        Welcome to PUMATO Pilots! These Partner Terms &amp; Conditions (“Terms”)
                        govern your participation as an independent service partner within the
                        PUMATO ecosystem.
                    </p>

                    <p className="text-gray-300 leading-relaxed text-sm md:text-base mb-8">
                        By submitting a PUMATO Pilots application, you acknowledge that you have
                        read, understood and agreed to these Partner Terms &amp; Conditions, Partner
                        Guidelines, Benefits Policy and Code of Conduct. Application submission does
                        not guarantee approval. Your Pilot status becomes active only after
                        verification and approval by PUMATO Admin.
                    </p>

                    <div className="space-y-12">
                        <TermBlock title="Service-specific Terms">
                            <TermBlock title="1. Passenger Ride Service">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    Terms governing passenger transportation services provided by
                                    approved PUMATO Pilots using motorcycles or scooters.
                                </p>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Eligibility and documents
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Pilots must be at least 18 years old and satisfy all
                                        applicable legal requirements.
                                    </li>
                                    <li>
                                        A valid driving licence and all legally required vehicle
                                        documents must be maintained.
                                    </li>
                                    <li>
                                        The vehicle must be legally permitted, properly maintained
                                        and suitable for the service.
                                    </li>
                                    <li>
                                        Only approved motorcycles and scooters may be used under the
                                        initial programme.
                                    </li>
                                </ul>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Ride responsibilities
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Pilots must follow applicable traffic laws and road-safety
                                        requirements.
                                    </li>
                                    <li>
                                        Legally required helmets and passenger-safety measures must
                                        be followed.
                                    </li>
                                    <li>
                                        Riding under the influence of alcohol or drugs is strictly
                                        prohibited.
                                    </li>
                                    <li>
                                        Unsafe riding, overloading and distracted riding are
                                        prohibited.
                                    </li>
                                    <li>
                                        Pilots must follow the applicable booking, pickup, drop-off
                                        and ride-verification procedures.
                                    </li>
                                    <li>
                                        Pilots must treat passengers respectfully and protect their
                                        personal information.
                                    </li>
                                </ul>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Booking and cancellation
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>Pilots may decline requests they have not accepted.</li>
                                    <li>
                                        Accepted rides should be completed or appropriately
                                        cancelled for valid reasons.
                                    </li>
                                    <li>
                                        Delays, customer unavailability and emergencies should be
                                        communicated promptly.
                                    </li>
                                    <li>
                                        Incidents will be reviewed by PUMATO Admin based on their
                                        circumstances and available evidence.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="2. Food Delivery Service">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    Terms governing the collection and delivery of food orders from
                                    PUMATO partner restaurants and other authorised food vendors.
                                </p>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Pilot responsibilities
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Collect the correct order and verify the relevant order
                                        details.
                                    </li>
                                    <li>
                                        Handle food packages carefully and maintain reasonable
                                        hygiene.
                                    </li>
                                    <li>
                                        Do not open, consume, tamper with or unnecessarily interfere
                                        with customer orders.
                                    </li>
                                    <li>
                                        Deliver orders to the correct customer or authorised
                                        recipient.
                                    </li>
                                    <li>
                                        Follow applicable pickup, delivery and confirmation
                                        procedures.
                                    </li>
                                    <li>
                                        Inform the relevant party about significant delays, missing
                                        items or order-related issues.
                                    </li>
                                    <li>
                                        Do not demand additional delivery charges or unauthorised
                                        payments from customers.
                                    </li>
                                </ul>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Food handling and complaints
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Pilots must take reasonable care to prevent damage,
                                        contamination or spillage during transportation.
                                    </li>
                                    <li>
                                        Any damaged, missing, incorrect or tampered order must be
                                        reported promptly.
                                    </li>
                                    <li>
                                        Food quality, preparation and packaging concerns should be
                                        reported to PUMATO Admin and/or the relevant vendor.
                                    </li>
                                    <li>
                                        Pilots must cooperate with reasonable investigations into
                                        delivery-related complaints.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="3. Parcel Delivery Service">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    Terms governing the collection and transportation of parcels and
                                    other authorised items through PUMATO.
                                </p>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Pilot responsibilities
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Verify the correct parcel and collection details before
                                        accepting custody.
                                    </li>
                                    <li>
                                        Handle parcels carefully and prevent avoidable damage, loss
                                        or tampering.
                                    </li>
                                    <li>
                                        Follow the prescribed pickup and delivery confirmation
                                        process.
                                    </li>
                                    <li>
                                        Deliver parcels only to the intended recipient or an
                                        authorised person.
                                    </li>
                                    <li>
                                        Do not open, inspect, use, retain or tamper with parcels
                                        without proper authorisation or a legitimate safety or legal
                                        reason.
                                    </li>
                                    <li>
                                        Report lost, damaged, suspicious or tampered parcels
                                        immediately.
                                    </li>
                                </ul>

                                <h4 className="font-bold text-white mt-6 mb-2">Prohibited items</h4>
                                <p className="text-gray-400 mt-2">
                                    Pilots must not knowingly accept or transport illegal,
                                    dangerous, prohibited or suspicious items.
                                </p>

                                <h4 className="font-bold text-white mt-6 mb-2">Delivery issues</h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        If the recipient is unavailable, follow the prescribed
                                        procedure.
                                    </li>
                                    <li>
                                        Do not leave parcels unattended or hand them to unauthorised
                                        persons unless the applicable service procedure expressly
                                        permits it.
                                    </li>
                                    <li>
                                        Significant delays, failed deliveries and collection issues
                                        must be reported promptly.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="4. Shop Pickup Service">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    Terms governing the collection of customer purchases from
                                    authorised shops, stores and business partners.
                                </p>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Pilot responsibilities
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Collect the correct items and verify the purchase or pickup
                                        details.
                                    </li>
                                    <li>Follow the shop&apos;s authorised handover procedure.</li>
                                    <li>Handle purchased items carefully during transportation.</li>
                                    <li>
                                        Do not substitute, remove, use or tamper with customer
                                        purchases.
                                    </li>
                                    <li>
                                        Report unavailable items, incorrect orders, damaged products
                                        or collection difficulties.
                                    </li>
                                    <li>
                                        Deliver purchases to the correct customer or authorised
                                        recipient.
                                    </li>
                                </ul>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Payments and receipts
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Any payment or cash collection must be expressly authorised
                                        under the applicable service procedure.
                                    </li>
                                    <li>
                                        Pilots must not make unauthorised purchases or accept
                                        additional charges on behalf of customers.
                                    </li>
                                    <li>
                                        Receipts, transaction records and other required
                                        confirmations must be retained or submitted as instructed.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="5. Laundry Pickup &amp; Delivery Service">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    Terms governing the pickup and delivery of laundry between
                                    customers and authorised laundry partners.
                                </p>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Pilot responsibilities
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Verify the correct customer and laundry collection details.
                                    </li>
                                    <li>
                                        Handle clothing and other laundry items with reasonable
                                        care.
                                    </li>
                                    <li>
                                        Follow the prescribed pickup, handover and delivery
                                        confirmation procedures.
                                    </li>
                                    <li>
                                        Do not use, remove, exchange or tamper with customer
                                        belongings.
                                    </li>
                                    <li>
                                        Report missing, damaged or incorrectly handed-over items
                                        immediately.
                                    </li>
                                    <li>
                                        Follow scheduled pickup and delivery windows where
                                        applicable.
                                    </li>
                                </ul>

                                <h4 className="font-bold text-white mt-6 mb-2">
                                    Responsibility for items
                                </h4>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Pilots must take reasonable care while items are in their
                                        custody.
                                    </li>
                                    <li>
                                        Any loss, damage or discrepancy must be reported promptly.
                                    </li>
                                    <li>
                                        Laundry quality, cleaning results and processing concerns
                                        should be directed to the relevant laundry partner and
                                        PUMATO Admin.
                                    </li>
                                </ul>
                            </TermBlock>
                        </TermBlock>

                        <TermBlock title="Common Provisions">
                            <TermBlock title="1. Eligibility and Approval">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        PUMATO Pilots is open to members of the campus community who
                                        satisfy the applicable eligibility requirements.
                                    </li>
                                    <li>The minimum applicant age is 18 years.</li>
                                    <li>
                                        Campus association may be verified by PUMATO Admin through
                                        suitable means.
                                    </li>
                                    <li>A physical campus identity card is not compulsory.</li>
                                    <li>
                                        Meeting eligibility requirements does not guarantee
                                        approval.
                                    </li>
                                    <li>
                                        Separate verification and approval may be required for
                                        individual services.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="2. Independent and Flexible Participation">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>Pilots participate as independent service partners.</li>
                                    <li>
                                        There are no compulsory fixed working hours, minimum working
                                        hours or minimum booking requirements.
                                    </li>
                                    <li>
                                        Pilots may choose their availability and decline requests
                                        they have not accepted.
                                    </li>
                                    <li>Pilots may participate in multiple approved services.</li>
                                    <li>
                                        Service-specific operating hours or arrangements may apply.
                                    </li>
                                    <li>
                                        Accepted bookings must be completed or appropriately
                                        cancelled.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="3. Cash Collection, COD and Remittance">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Any cash on delivery (COD) or payments collected by Pilots
                                        from customers or on behalf of merchants must be held
                                        safely.
                                    </li>
                                    <li>
                                        Collected cash must be remitted or settled within the
                                        prescribed settlement schedule.
                                    </li>
                                    <li>
                                        Failing to remit, withholding, or misusing collected
                                        customer or merchant funds will lead to immediate account
                                        termination and recovery proceedings.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="4. Earnings, Commission and Payments">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Earnings structures may vary by service and may include
                                        fixed, distance-based, percentage-based or incentive-based
                                        payments.
                                    </li>
                                    <li>
                                        Applicable commission, charges and deductions will be
                                        communicated before participation in the relevant service.
                                    </li>
                                    <li>No undisclosed deductions will be applied.</li>
                                    <li>
                                        Settlement arrangements may be daily, weekly or on-demand,
                                        depending on the service.
                                    </li>
                                    <li>
                                        Pilots should be able to access a transparent earnings
                                        breakdown.
                                    </li>
                                    <li>
                                        Voluntary customer tips belong entirely to the Pilot. PUMATO
                                        does not charge commission on voluntary tips.
                                    </li>
                                    <li>Tips must never be made compulsory.</li>
                                    <li>
                                        Cash collection is permitted only where expressly
                                        authorised.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="5. Code of Conduct">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    Every Pilot must maintain respectful and responsible conduct.
                                </p>
                                <p className="text-gray-400 mt-2">The following are prohibited:</p>
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Harassment, discrimination, threats or abusive behaviour.
                                    </li>
                                    <li>
                                        Fraud, theft, manipulation of earnings or unauthorised
                                        charges.
                                    </li>
                                    <li>Misuse or disclosure of customer information.</li>
                                    <li>Deliberate manipulation of the PUMATO platform.</li>
                                    <li>Unsafe or unlawful conduct while performing services.</li>
                                    <li>
                                        Misuse of customer property, parcels or business-partner
                                        resources.
                                    </li>
                                </ul>
                                <p className="text-gray-400 mt-2">
                                    Serious misconduct may result in immediate protective suspension
                                    and possible termination. Minor violations may be addressed
                                    through proportionate warnings or restrictions.
                                </p>
                            </TermBlock>

                            <TermBlock title="6. Customer Privacy and Information">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Pilots must protect customer names, phone numbers,
                                        addresses, booking details and other personal information.
                                    </li>
                                    <li>
                                        Customer information must only be used for the authorised
                                        service.
                                    </li>
                                    <li>
                                        Sharing, storing, disclosing or misusing customer
                                        information for unrelated purposes is prohibited.
                                    </li>
                                    <li>
                                        Pilot personal information will be handled by PUMATO
                                        according to applicable privacy and data-protection
                                        requirements.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="7. Account and Pilot Identity">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Every approved Pilot receives an individual digital Pilot
                                        identity.
                                    </li>
                                    <li>
                                        Pilot accounts and credentials are personal and
                                        non-transferable.
                                    </li>
                                    <li>
                                        Sharing, lending, selling or transferring an account is
                                        prohibited.
                                    </li>
                                    <li>
                                        Only the verified Pilot may perform services under that
                                        Pilot identity.
                                    </li>
                                    <li>Suspected account misuse must be reported promptly.</li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="8. Platform Integrity and Fair Participation">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        While registered as an active PUMATO Pilot, a Pilot must not
                                        provide service & divert PUMATO customers, bookings or
                                        business opportunities to competing channels or offline
                                        arrangements.
                                    </li>
                                    <li>
                                        PUMATO customer information and internal business
                                        information must not be misused for competing activities.
                                    </li>
                                    <li>
                                        Exclusivity does not require fixed working hours, continuous
                                        online availability or a minimum number of bookings.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="9. Inactivity">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        An account may be marked inactive if the Pilot does not
                                        participate in any approved service for 45 consecutive days.
                                    </li>
                                    <li>
                                        Inactive status may temporarily suspend access to Pilot
                                        privileges and benefits.
                                    </li>
                                    <li>
                                        Pilots may request reactivation, subject to Admin
                                        verification and approval.
                                    </li>
                                    <li>
                                        Being offline or declining unaccepted booking requests is
                                        not, by itself, misconduct.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="10. Complaints and Disputes">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Official complaints, payment disputes and other formal
                                        requests must be submitted through the designated PUMATO
                                        support email.
                                    </li>
                                    <li>
                                        PUMATO Admin may investigate complaints and request relevant
                                        information or evidence.
                                    </li>
                                    <li>
                                        Administrative decisions will be based on the circumstances
                                        and available records.
                                    </li>
                                    <li>
                                        Pilots may submit appeals against warnings, restrictions,
                                        suspension or termination.
                                    </li>
                                    <li>
                                        Immediate protective restrictions may remain in place during
                                        an investigation or appeal.
                                    </li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="11. Suspension and Termination">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    PUMATO Admin may restrict individual service access, temporarily
                                    suspend a Pilot account or terminate Pilot participation where
                                    necessary.
                                </p>
                                <p className="text-gray-400 mt-2">
                                    Serious misconduct, fraud, safety concerns, threats to
                                    customers, account misuse or risks to platform integrity may
                                    result in immediate protective action.
                                </p>
                                <p className="text-gray-400 mt-2">
                                    Minor violations may be addressed through warnings or
                                    proportionate corrective measures.
                                </p>
                            </TermBlock>

                            <TermBlock title="12. Voluntary Exit">
                                <ul className="list-disc pl-5 space-y-2 text-gray-400 mt-2">
                                    <li>
                                        Pilots may leave the programme at any time without a
                                        compulsory notice period or exit fee.
                                    </li>
                                    <li>
                                        Accepted bookings must be completed or appropriately
                                        cancelled or handed over.
                                    </li>
                                    <li>
                                        Legitimate pending earnings will be calculated and settled
                                        according to the applicable payment policy.
                                    </li>
                                    <li>Pilot-only benefits may end when Pilot status ends.</li>
                                </ul>
                            </TermBlock>

                            <TermBlock title="13. Pilot Benefits">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    PUMATO may introduce exclusive benefits and privileges for
                                    approved Pilots. PUMATO Pilot Benefits are subject to
                                    availability.
                                </p>
                                <p className="text-gray-400 mt-2">
                                    Approved Pilots are intended to receive a tier membership by
                                    default once the programme launches, subject to maintaining
                                    active Pilot status and complying with the applicable programme
                                    rules.
                                </p>
                                <p className="text-gray-400 mt-2">
                                    The loyalty programme, booking privileges and associated
                                    discounts are not currently available. Details will be announced
                                    separately.
                                </p>
                            </TermBlock>

                            <TermBlock title="14. Administrative Authority">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    PUMATO Admin reserves the right to introduce, modify, suspend or
                                    discontinue services, eligibility requirements, verification
                                    procedures, earnings structures, commissions, incentives,
                                    benefits, operating arrangements and programme policies.
                                </p>
                                <p className="text-gray-400 mt-2">
                                    Significant changes will be communicated appropriately. All
                                    administrative decisions and policy changes remain subject to
                                    applicable law and contractual obligations.
                                </p>
                            </TermBlock>

                            <TermBlock title="15. Acceptance of Terms">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    By submitting the PUMATO Pilots application, the applicant
                                    confirms that they have read, understood and agreed to these
                                    Partner Terms &amp; Conditions, Partner Guidelines, Benefits
                                    Policy and Code of Conduct.
                                </p>
                                <p className="text-gray-400 mt-2">
                                    Application submission records digital acceptance but does not
                                    guarantee approval. Pilot status begins only after PUMATO Admin
                                    approves the application and activates the relevant service
                                    access.
                                </p>
                            </TermBlock>

                            <TermBlock title="16. Contact and Official Communication">
                                <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                                    For applications, complaints, payment disputes, appeals and
                                    official requests, contact:
                                </p>
                                <p className="text-gray-400 mt-2">
                                    <strong className="text-white">PUMATO Admin</strong>
                                </p>
                                <p className="text-gray-400">
                                    Email:{" "}
                                    <a
                                        href="mailto:pumato.feedbacks@gmail.com"
                                        className="text-orange-400 hover:underline"
                                    >
                                        pumato.feedbacks@gmail.com
                                    </a>
                                </p>
                            </TermBlock>
                        </TermBlock>

                        <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-xl text-gray-300 italic leading-relaxed">
                            These terms should be reviewed by qualified Indian legal counsel before
                            publication. Applicable laws and mandatory statutory rights will prevail
                            over any inconsistent provision.
                        </div>
                    </div>

                    <div className="mt-12 text-center text-gray-500 text-sm">
                        <p>© {YEAR} PUMATO. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </main>
    );
}

function TermBlock({ title, children }: { title: ReactNode; children: ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xl font-bold text-orange-400">{title}</h3>
            <div className="text-gray-300 leading-relaxed text-sm md:text-base">{children}</div>
        </div>
    );
}
