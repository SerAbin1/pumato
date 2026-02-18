"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    className = "",
    optionClassName = ""
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
        <div className={`relative z-[60] ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="w-full bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-sm text-white flex items-center justify-between hover:bg-white/10 hover:border-white/20 transition-all focus:outline-none focus:border-orange-500/50 group"
            >
                <span className={`${!selectedOption ? "text-gray-500" : "text-white"} font-medium`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-gray-500 group-hover:text-gray-300 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute z-[100] w-full mt-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
                    >
                        <div className="max-h-60 overflow-y-auto scrollbar-hide">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors hover:bg-white/5 ${value === option.value ? "text-orange-500 bg-orange-500/5" : "text-gray-300"
                                        } ${optionClassName}`}
                                >
                                    <span className="font-medium">{option.label}</span>
                                    {value === option.value && <Check size={14} className="text-orange-500" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
