"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Rocket, Sparkles, Clock } from "lucide-react";

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen w-full bg-black text-white relative flex flex-col items-center justify-center p-6 overflow-hidden selection:bg-orange-500 selection:text-white">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-orange-600/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/10 rounded-full blur-[150px] animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </div>

      {/* Glass Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
        className="relative z-10 max-w-2xl w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-14 text-center shadow-2xl shadow-black/50 overflow-hidden"
      >
        {/* Shine Effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500/20 to-purple-600/20 border border-white/10 mb-8 relative"
        >
            <div className="absolute inset-0 rounded-full bg-white/5 animate-ping"></div>
            <Rocket className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" size={36} />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-5xl md:text-7xl font-black tracking-tight mb-4"
        >
          Coming <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-purple-500">Soon.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-lg md:text-xl text-gray-400 font-light mb-10 leading-relaxed max-w-lg mx-auto"
        >
          We're crafting something extraordinary. This feature is currently in the lab and will be launching shortly. 
        </motion.p>

        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col md:flex-row gap-4 justify-center items-center"
        >
            <Link 
                href="/"
                className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-sm md:text-base transition-all hover:bg-orange-50 hover:scale-105 flex items-center gap-2"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                Back to Home
            </Link>
        </motion.div>

      </motion.div>

      {/* Footer text */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 text-white/20 text-xs md:text-sm font-mono"
      >
        PUMATO LABS • WORK IN PROGRESS
      </motion.p>

    </main>
  );
}
