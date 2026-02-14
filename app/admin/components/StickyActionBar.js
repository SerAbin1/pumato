import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, ChevronUp, ChevronDown, Sparkles } from "lucide-react";

export default function StickyActionBar({
    onSave,
    onCancel,
    isSaving,
    saveLabel = "Save Changes",
    cancelLabel = "Cancel",
    title,
    children
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 z-[60] p-4 pb-8 md:pb-4 border-t border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl"
            >
                <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 md:gap-4">
                    {/* Left Side: Title/Context */}
                    <div className="hidden md:block">
                        {title && (
                            <p className="text-white font-bold text-sm flex items-center gap-2">
                                <Sparkles size={16} className="text-orange-500" />
                                {title}
                            </p>
                        )}
                    </div>

                    {/* Right Side: Actions */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="px-4 md:px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5 text-xs md:text-sm"
                            >
                                {cancelLabel}
                            </button>
                        )}

                        {children}

                        {/* Scroll Controls */}
                        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl items-center hidden md:flex">
                            <button
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="p-2.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                title="Scroll to Top"
                            >
                                <ChevronUp size={20} />
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                            <button
                                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                                className="p-2.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                title="Scroll to Bottom"
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>

                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="flex-1 md:flex-none bg-orange-600 text-white px-4 md:px-8 py-3 rounded-xl font-bold hover:bg-orange-500 transition-all shadow-xl shadow-orange-900/40 flex items-center justify-center gap-2 group text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> :
                                <Save size={18} className="group-hover:scale-110 transition-transform" />}
                            <span>{isSaving ? "Saving..." : saveLabel}</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
