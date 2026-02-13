import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Save, Loader2, ChevronUp, ChevronDown } from "lucide-react";

export default function StickyActionBar({
    onSave,
    onCancel,
    isSaving,
    saveLabel = "Save Changes",
    cancelLabel = "Cancel",
    children
}) {
    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 200, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none flex justify-center"
            >
                <div className="bg-gray-900/90 backdrop-blur-2xl border border-white/10 p-4 rounded-[2rem] shadow-2xl pointer-events-auto flex items-center justify-between gap-4 max-w-4xl w-full mx-auto ring-1 ring-white/10">

                    {/* Left Side: Children (e.g., specific actions) or Scroll Controls */}
                    <div className="flex items-center gap-4">
                        {children}

                        {/* Scroll Controls */}
                        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl items-center hidden md:flex">
                            <button
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                title="Scroll to Top"
                            >
                                <ChevronUp size={20} />
                            </button>
                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                            <button
                                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                title="Scroll to Bottom"
                            >
                                <ChevronDown size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Right Side: Cancel & Save */}
                    <div className="flex items-center gap-3">
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
                            >
                                {cancelLabel}
                            </button>
                        )}

                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-500 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm group"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={18} /> :
                                <Save size={18} className="group-hover:scale-110 transition-transform" />}
                            {isSaving ? "Saving..." : saveLabel}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
