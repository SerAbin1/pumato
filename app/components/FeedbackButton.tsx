"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useUserAuth } from "../context/UserAuthContext";
import { createFeedback } from "@/lib/repositories";
import { FEEDBACK_MAX_LENGTH } from "@/lib/schemas/feedback";

const HIDDEN_PREFIXES = ["/admin", "/partner", "/delivery-partner"];

export default function FeedbackButton() {
    const { user } = useUserAuth();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    if (HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setIsSending(true);
        try {
            await createFeedback({
                message,
                userId: user?.uid ?? null,
                userEmail: user?.email ?? null,
                page: pathname || "",
            });
            toast.success("Thanks! Your message was sent.");
            setMessage("");
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to send feedback:", error);
            toast.error("Couldn't send your message. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-4 left-4 z-[55]">
            <AnimatePresence>
                {isOpen && (
                    <motion.form
                        onSubmit={handleSubmit}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-14 left-0 w-72 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                Feedback &amp; Support
                            </h4>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-white"
                                aria-label="Close"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={FEEDBACK_MAX_LENGTH}
                            rows={4}
                            required
                            placeholder="Found a bug or have an idea? Tell us."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
                        />
                        <button
                            type="submit"
                            disabled={isSending || !message.trim()}
                            className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-bold disabled:opacity-50"
                        >
                            {isSending ? "Sending..." : "Send"}
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="p-3 rounded-full bg-zinc-900/90 border border-white/10 text-gray-200 hover:text-white hover:bg-zinc-800 shadow-lg transition-colors"
                aria-label="Send feedback"
            >
                <MessageSquare size={20} />
            </button>
        </div>
    );
}
