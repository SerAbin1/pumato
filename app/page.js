"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useInView, useMotionValue, useMotionTemplate } from "framer-motion";
import { Utensils, Shirt, Instagram, Mail, MessageCircle, ArrowRight, Sparkles, Zap, Wallet, ShieldCheck } from "lucide-react";
import { useRef, useEffect, useState } from "react";

// --- COMPONENTS ---

// 1. 3D Tilt Card Component
function TiltCard({ children, className }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 20 });

  const transform = useMotionTemplate`rotateX(${xSpring}deg) rotateY(${ySpring}deg)`;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device supports hover or is small screen
    setIsMobile(window.matchMedia("(hover: none) or (max-width: 768px)").matches);
  }, []);

  const handleMouseMove = (e) => {
    if (isMobile || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = (e.clientX - rect.left) * 32.5;
    const mouseY = (e.clientY - rect.top) * 32.5;

    const rX = (mouseY / height - 32.5 / 2) * -1;
    const rY = (mouseX / width - 32.5 / 2);

    x.set(rX);
    y.set(rY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // Remove preserve-3d to fix border-radius clipping on hover
      style={{ transform: isMobile ? "none" : transform }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// 2. Animated Counter
function Counter({ value, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const numericValue = parseInt(value.replace(/\D/g, ''));
      const duration = 2000;
      const steps = 60;
      const increment = numericValue / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= numericValue) {
          setCount(numericValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ type: "spring", duration: 0.8 }}
      className="p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors group"
    >
      <h3 className="text-4xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 group-hover:to-orange-400 transition-all tabular-nums">
        {count}{value.includes('+') ? '+' : ''}{value.includes('k') ? 'k' : ''}
      </h3>
      <p className="text-gray-400 font-medium uppercase tracking-wider text-xs">{label}</p>
    </motion.div>
  );
}

export default function GatewayPage() {
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -200]);

  return (
    <main className="min-h-screen w-full bg-black text-white selection:bg-orange-500 selection:text-white overflow-x-hidden">

      {/* Global Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* SECTION 1: HERO */}
      <section className="h-screen w-full flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
        {/* Dynamic Background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 10, repeat: Infinity }}
            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/40 via-black to-black"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="z-10 max-w-6xl flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1.5, bounce: 0.5 }}
            className="relative mb-12"
          >
            <div className="absolute inset-0 bg-orange-500/30 blur-[80px] rounded-full animate-pulse"></div>
            <img
              src="/logo.png"
              className="h-40 md:h-64 lg:h-72 w-auto drop-shadow-[0_0_50px_rgba(249,115,22,0.5)] relative z-10"
              alt="Pumato Logo"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-tight">
              Campus life, <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-500 to-purple-600 animate-text-shimmer bg-[200%_auto]">
                Upgraded.
              </span>
            </h1>
            <motion.p
              className="text-gray-400 text-lg md:text-2xl font-light max-w-2xl mx-auto mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              The <span className="text-white font-medium">Super-App</span> for Every Hostel Need — Food, Laundry, and More, Delivered Fast.
            </motion.p>

            <motion.button
              onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:scale-105 hover:bg-orange-50 transition-all flex items-center gap-2 mx-auto"
              whileHover={{ gap: '12px' }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started <ArrowRight size={20} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: 3D SERVICES CARDS */}
      <section className="py-24 px-4 w-full relative z-10" id="services">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 md:gap-8 perspective-1000">
            {/* Food Card */}
            <TiltCard className="relative h-[50vh] md:h-[70vh] w-full rounded-[2.5rem] overflow-hidden group border border-white/10 cursor-pointer">
              <Link href="/delivery" className="block h-full w-full">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                <motion.img
                  src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1000&q=80"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt="Food"
                />
                <div className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-10 mb-4">
                  <div className="inline-flex items-center gap-2 bg-orange-600/90 text-white px-3 py-1 rounded-full text-xs font-bold mb-3 backdrop-blur-md">
                    <Utensils size={12} /> <span>30 min</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">Food.</h2>
                  <p className="text-gray-300 text-sm md:text-base max-w-sm mb-4 line-clamp-2">Craving something good? We bring your favorites to your door.</p>
                  <span className="inline-flex items-center gap-2 text-white font-bold border-b border-white/30 pb-1 group-hover:border-orange-500 group-hover:text-orange-500 transition-colors text-sm">
                    Order Now <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            </TiltCard>

            {/* Grocery Card */}
            <TiltCard className="relative h-[50vh] md:h-[70vh] w-full rounded-[2.5rem] overflow-hidden group border border-white/10 cursor-pointer">
              <Link href="/coming-soon" className="block h-full w-full">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                <motion.img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt="Grocery"
                />
                <div className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-10 mb-4">
                  <div className="inline-flex items-center gap-2 bg-green-600/90 text-white px-3 py-1 rounded-full text-xs font-bold mb-3 backdrop-blur-md">
                    <Sparkles size={12} /> <span>Express</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">Grocery.</h2>
                  <p className="text-gray-300 text-sm md:text-base max-w-sm mb-4 line-clamp-2">Essentials delivered in minutes. Milk, bread, snacks & more.</p>
                  <span className="inline-flex items-center gap-2 text-white font-bold border-b border-white/30 pb-1 group-hover:border-green-500 group-hover:text-green-500 transition-colors text-sm">
                    Shop Now <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            </TiltCard>

            {/* Laundry Card */}
            <TiltCard className="relative h-[50vh] md:h-[70vh] w-full rounded-[2.5rem] overflow-hidden group border border-white/10 cursor-pointer">
              <Link href="/coming-soon" className="block h-full w-full">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10" />
                <motion.img
                  src="https://www.sourceoffabric.com/wp-content/uploads/2024/09/217067478_m_normal_none-1200x780-1.jpg"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt="Laundry"
                />
                <div className="absolute inset-x-0 bottom-0 z-20 p-6 md:p-10 mb-4">
                  <div className="inline-flex items-center gap-2 bg-blue-600/90 text-white px-3 py-1 rounded-full text-xs font-bold mb-3 backdrop-blur-md">
                    <Shirt size={12} /> <span>24h Turnaround</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter">Laundry.</h2>
                  <p className="text-gray-300 text-sm md:text-base max-w-sm mb-4 line-clamp-2">Look sharp, study hard. We handle the washing.</p>
                  <span className="inline-flex items-center gap-2 text-white font-bold border-b border-white/30 pb-1 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors text-sm">
                    Book Pickup <ArrowRight size={16} />
                  </span>
                </div>
              </Link>
            </TiltCard>
          </div>
        </div>
      </section>

      {/* SECTION 3: VISION w/ Parallax */}
      <section className="py-32 px-4 w-full bg-black relative overflow-hidden">
        <motion.div style={{ y: yParallax }} className="absolute -right-40 top-20 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
        <motion.div style={{ y: yParallax }} className="absolute -left-40 bottom-20 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.span
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              className="text-orange-500 font-bold tracking-[0.3em] text-sm uppercase"
            >
              Our Vision
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
              className="text-4xl md:text-6xl font-bold mt-4 leading-tight"
            >
              Built by Students, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-600">for Students.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
              className="text-gray-400 text-lg md:text-xl mt-6 max-w-3xl mx-auto leading-relaxed"
            >
              PUMATO aims to become a student-powered campus platform that solves everyday university problems by providing fast, affordable, and reliable services.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center md:text-left mb-20">
            {[
              { title: "Fast", desc: "Delivery times optimized for campus layouts.", icon: <Zap size={40} className="text-orange-500" /> },
              { title: "Affordable", desc: "Prices tailored for student budgets.", icon: <Wallet size={40} className="text-orange-500" /> },
              { title: "Reliable", desc: "Trusted by thousands of students daily.", icon: <ShieldCheck size={40} className="text-orange-500" /> }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-orange-500/50 transition-colors"
              >
                <div className="text-4xl mb-6">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center bg-gradient-to-r from-orange-500/10 via-transparent to-purple-500/10 p-10 md:p-16 rounded-[2.5rem] border border-white/10"
          >
            <span className="text-purple-400 font-bold tracking-[0.3em] text-sm uppercase">Our Mission</span>
            <p className="text-white text-xl md:text-2xl mt-4 leading-relaxed font-medium max-w-3xl mx-auto">
              Our mission is to provide fast and reliable campus deliveries, support student needs, and create work opportunities for students through a student-run service platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* SECTION 4: STATS */}
      <section className="py-24 border-y border-white/5 bg-black/50">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <Counter label="Happy Students" value="5000+" />
          <Counter label="Orders Delivered" value="25k+" />
          <Counter label="Partner Services" value="25+" />
          <Counter label="Campus Reach" value="100%" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-24 text-center bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-900/10 to-transparent pointer-events-none"></div>
        <h2 className="text-3xl font-bold mb-8">Join the Revolution</h2>
        <div className="flex justify-center gap-6 mb-12">
          <a href="https://www.instagram.com/pumato_pu_?igsh=M2FjOHJ2aW56bmRs" target="_blank" rel="noreferrer" className="p-4 bg-white/10 rounded-full hover:bg-white hover:text-black transition-all cursor-pointer">
            <Instagram size={24} />
          </a>
          <a href="https://wa.me/917511153875" target="_blank" rel="noreferrer" className="p-4 bg-white/10 rounded-full hover:bg-white hover:text-black transition-all cursor-pointer">
            <MessageCircle size={24} />
          </a>
          <a href="mailto:pumato.feedbacks@gmail.com" className="p-4 bg-white/10 rounded-full hover:bg-white hover:text-black transition-all cursor-pointer">
            <Mail size={24} />
          </a>
        </div>
        <div className="flex items-center justify-center gap-2 opacity-50">
          <img src="/logo.png" className="h-6 w-auto grayscale" alt="Logo" />
          <span className="text-sm">© 2024 Pumato.</span>
        </div>
      </footer>
    </main>
  );
}
