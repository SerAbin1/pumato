"use client";

import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import Link from "next/link";
import { Instagram, Linkedin, Twitter } from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-white text-gray-900">
            <Navbar />

            {/* Hero Section */}
            <section className="relative h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
                {/* Background Video/Image Placeholder */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-black/60 z-10"></div>
                    <img
                        src="https://images.unsplash.com/photo-1543353071-873f17a7a088?w=1600&h=900&fit=crop"
                        className="w-full h-full object-cover"
                        alt="Students eating"
                    />
                </div>

                <div className="relative z-20 max-w-4xl mx-auto text-white">
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-6xl md:text-8xl font-black mb-6 tracking-tight"
                    >
                        Pumato
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="text-xl md:text-3xl font-light mb-10 opacity-90"
                    >
                        Fueling Pondicherry's Students, One Meal at a Time.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Link href="/delivery" className="bg-red-600 hover:bg-red-700 text-white text-xl font-bold px-12 py-4 rounded-full transition-all shadow-xl hover:scale-105 inline-block">
                            Order Now
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* About / Vision */}
            <section className="py-24 px-4 max-w-5xl mx-auto text-center">
                <h2 className="text-4xl font-bold mb-12">Who We Are</h2>
                <div className="grid md:grid-cols-2 gap-12 items-center text-left">
                    <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                        <p>
                            We are a group of students from Pondicherry College who realized that good food shouldn't be hard to get while living in a hostel.
                        </p>
                        <p>
                            Pumato started in a dorm room with a simple vision: to connect every student with the best local food spots, delivered fast and without hassle.
                        </p>
                    </div>
                    <div className="relative h-80 rounded-2xl overflow-hidden shadow-2xl skew-y-3 transform hover:skew-y-0 transition-transform duration-500">
                        <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80" className="w-full h-full object-cover" alt="Student Team" />
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-red-600 text-white pattern-isometric">
                <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { label: "Happy Students", value: "5000+" },
                        { label: "Orders Delivered", value: "25k+" },
                        { label: "Restaurant Partners", value: "50+" },
                        { label: "Avg Delivery Time", value: "25m" }
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, type: "spring" }}
                            className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm"
                        >
                            <h3 className="text-4xl md:text-5xl font-black mb-2">{stat.value}</h3>
                            <p className="opacity-90 font-medium uppercase tracking-wide text-sm">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">From hunger to happiness in 3 simple steps.</p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-12 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-0 w-full h-1 bg-gradient-to-r from-red-100 via-red-200 to-red-100 -z-10"></div>

                        {[
                            { title: "Choose", desc: "Browse top restaurants and hostel canteens.", icon: "🍔" },
                            { title: "Order", desc: "Easy WhatsApp checkout with student discounts.", icon: "📱" },
                            { title: "Eat", desc: "Lightning fast delivery to your room door.", icon: "😋" }
                        ].map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center relative"
                            >
                                <div className="w-24 h-24 mx-auto bg-red-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner ring-8 ring-white">
                                    {step.icon}
                                </div>
                                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Grid (Bento Box) */}
            <section className="py-24 px-4 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Why Pumato?</h2>
                    <div className="grid md:grid-cols-3 md:grid-rows-2 gap-6 h-auto md:h-[600px]">
                        <motion.div
                            whileHover={{ scale: 0.98 }}
                            className="bg-black text-white p-8 rounded-3xl md:col-span-2 md:row-span-2 flex flex-col justify-end relative overflow-hidden group"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80"
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                                alt="Restaurant"
                            />
                            <div className="relative z-10">
                                <h3 className="text-4xl font-bold mb-4">Hostel Delivery Experts</h3>
                                <p className="text-lg opacity-90 max-w-md">We know exactly where your block is. No more walking to the main gate to pick up your food.</p>
                            </div>
                        </motion.div>
                        <motion.div
                            whileHover={{ scale: 0.98 }}
                            className="bg-yellow-400 p-8 rounded-3xl flex flex-col justify-center items-center text-center group overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-yellow-500 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                            <h3 className="text-3xl font-bold text-red-900 mb-2">Late Nite?</h3>
                            <p className="font-medium text-red-800">We deliver till 3 AM.</p>
                            <div className="text-6xl mt-4 animate-bounce">🌙</div>
                        </motion.div>
                        <motion.div
                            whileHover={{ scale: 0.98 }}
                            className="bg-white p-8 rounded-3xl border border-gray-200 flex flex-col justify-center shadow-sm hover:shadow-xl transition-shadow"
                        >
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Student Prices</h3>
                            <p className="text-gray-600">Special discounts for college ID holders on selected brands.</p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Parallax CTA */}
            <section className="relative py-32 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1600&h=900&fit=crop"
                        className="w-full h-full object-cover"
                        alt="Food background"
                    />
                    <div className="absolute inset-0 bg-red-900/80"></div>
                </div>
                <div className="relative z-10 text-center text-white px-4 max-w-2xl">
                    <h2 className="text-4xl md:text-5xl font-black mb-8">Ready to Eat?</h2>
                    <Link
                        href="/delivery"
                        className="bg-white text-red-600 text-xl font-bold px-12 py-5 rounded-full inline-block shadow-2xl hover:bg-yellow-300 hover:text-red-800 transition-all hover:scale-105"
                    >
                        Browse Restaurants
                    </Link>
                </div>
            </section>

            {/* Connect Section */}
            <section className="bg-white py-24 px-4 text-center">
                <h2 className="text-4xl font-bold mb-8">Connect With Us</h2>
                <p className="text-xl text-gray-600 mb-12">Follow our journey and get exclusive deals.</p>
                <div className="flex justify-center gap-8">
                    <a href="#" className="p-4 bg-white rounded-full shadow-lg hover:text-pink-600 hover:scale-110 transition-all"><Instagram size={32} /></a>
                    <a href="#" className="p-4 bg-white rounded-full shadow-lg hover:text-blue-600 hover:scale-110 transition-all"><Linkedin size={32} /></a>
                    <a href="#" className="p-4 bg-white rounded-full shadow-lg hover:text-blue-400 hover:scale-110 transition-all"><Twitter size={32} /></a>
                </div>
            </section>
        </main>
    );
}
