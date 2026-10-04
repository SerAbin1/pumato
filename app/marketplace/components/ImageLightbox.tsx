"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { nextIndex, prevIndex, hasMultipleImages } from "@/lib/imageGallery";
import type { TouchEvent } from "react";

interface ImageLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    images?: string[];
    index?: number;
    onIndexChange: (index: number) => void;
    alt?: string;
}

const SWIPE_THRESHOLD_PX = 50;

// Fullscreen viewer for marketplace photos. Renders with object-contain so the whole
// image is always visible, whatever its aspect ratio — the fixed frames used by the
// listing grid and hero crop, this does not. The active image is owned by the caller
// so the thumbnail strip and the viewer can never disagree.
export default function ImageLightbox({
    isOpen,
    onClose,
    images = [],
    index = 0,
    onIndexChange,
    alt = "",
}: ImageLightboxProps) {
    const [mounted, setMounted] = useState(false);
    const touchStartX = useRef<number | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    const count = images.length;
    const multiple = hasMultipleImages(images);
    const activeIndex = Math.min(Math.max(index, 0), count - 1);
    const src = images[activeIndex];

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            document.body.style.overflow = "unset";
            return;
        }

        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowRight" && multiple) {
                onIndexChange?.(nextIndex(activeIndex, count));
            } else if (e.key === "ArrowLeft" && multiple) {
                onIndexChange?.(prevIndex(activeIndex, count));
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose, onIndexChange, multiple, activeIndex, count]);

    // Warm the browser cache for the neighbouring images so paging feels instant.
    useEffect(() => {
        if (!isOpen || !multiple) return;
        [nextIndex(activeIndex, count), prevIndex(activeIndex, count)].forEach((i) => {
            const neighbor = images[i];
            if (neighbor && typeof window !== "undefined") {
                const preloader = new window.Image();
                preloader.src = neighbor;
            }
        });
    }, [isOpen, multiple, activeIndex, count, images]);

    const go = useCallback(
        (delta: number) => {
            onIndexChange?.(
                delta > 0 ? nextIndex(activeIndex, count) : prevIndex(activeIndex, count)
            );
        },
        [onIndexChange, activeIndex, count]
    );

    const onTouchStart = (e: TouchEvent) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
    };

    const onTouchEnd = (e: TouchEvent) => {
        const startX = touchStartX.current;
        touchStartX.current = null;
        if (startX == null || !multiple) return;

        const endX = e.changedTouches[0]?.clientX ?? startX;
        if (Math.abs(endX - startX) >= SWIPE_THRESHOLD_PX) {
            go(endX < startX ? 1 : -1);
        }
    };

    if (!mounted || !count) return null;

    const lightboxContent = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label={alt ? `${alt} image viewer` : "Image viewer"}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                >
                    {/* Backdrop */}
                    <div
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md z-0"
                    />

                    {/* Image — object-contain is what makes the full photo visible */}
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-4 pt-16 pb-20">
                        <motion.div
                            key={src}
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.15 }}
                            className="relative w-full h-full"
                        >
                            <Image
                                src={src}
                                alt={alt}
                                fill
                                sizes="100vw"
                                className="object-contain"
                            />
                        </motion.div>
                    </div>

                    {/* Counter + close */}
                    <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4">
                        {multiple ? (
                            <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/10 tabular-nums">
                                {activeIndex + 1} / {count}
                            </span>
                        ) : (
                            <span />
                        )}
                        <button
                            ref={closeButtonRef}
                            onClick={onClose}
                            aria-label="Close image viewer"
                            className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-colors border border-white/10"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Prev / next */}
                    {multiple && (
                        <>
                            <button
                                onClick={() => go(-1)}
                                aria-label="Previous image"
                                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors border border-white/10"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={() => go(1)}
                                aria-label="Next image"
                                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors border border-white/10"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(lightboxContent, document.body);
}
