"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ArrowRight, GraduationCap } from "lucide-react";
import { useState, useEffect } from "react";
import { DEFAULT_CAMPUS_CONFIG } from "@/lib/constants";
import Image from "next/image";

export default function CampusSelector({ onSelect, currentCampus }) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!currentCampus) {
            setIsOpen(true);
        }
    }, [currentCampus]);

    const handleSelect = (campusId) => {
        onSelect(campusId);
        setIsOpen(false);
    };

    const campusImages = {
        'PU': '/campus/pu.jpg',
        'PTU': '/campus/ptu.jpg',
        'PIMS': '/campus/pims.jpg'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => currentCampus && setIsOpen(false)}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-5 h-full min-h-[500px]">
                            {/* Left Side - Visual */}
                            <div className="md:col-span-2 relative bg-zinc-800 hidden md:block">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 to-zinc-900/80 z-10" />
                                <div className="absolute inset-0 flex flex-col justify-end p-10 z-20">
                                    <div className="w-16 h-1 bg-orange-500 mb-6 rounded-full" />
                                    <h2 className="text-4xl font-black text-white leading-tight mb-4">
                                        Welcome to <span className="text-orange-500">Pumato</span>
                                    </h2>
                                    <p className="text-gray-400 font-medium">
                                        Select your campus to see accurate ordering hours, delivery charges, and local favorites.
                                    </p>
                                </div>
                            </div>

                            {/* Right Side - Content */}
                            <div className="md:col-span-3 p-8 md:p-12 flex flex-col justify-center">
                                <div className="mb-10 block md:hidden">
                                    <h2 className="text-3xl font-black text-white leading-tight mb-2">
                                        Welcome to <span className="text-orange-500">Pumato</span>
                                    </h2>
                                    <p className="text-gray-400 text-sm">Select your campus to get started.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                                            <MapPin size={18} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white">Choose Your Campus</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {DEFAULT_CAMPUS_CONFIG.map((campus) => (
                                            <button
                                                key={campus.id}
                                                onClick={() => handleSelect(campus.id)}
                                                className="group relative flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-orange-500/50 transition-all text-left"
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-xl font-black text-orange-500 group-hover:scale-110 transition-transform">
                                                        {campus.id[0]}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-white group-hover:text-orange-400 transition-colors uppercase tracking-wider">{campus.name}</h4>
                                                    </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                                    <ArrowRight size={20} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-4 text-gray-500">
                                        <GraduationCap size={20} className="opacity-50" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                            Accurate timings & delivery charges are calculated based on your location.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Close Button - only if campus already set */}
                        {currentCampus && (
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            >
                                <ArrowRight size={24} className="rotate-45" />
                            </button>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
