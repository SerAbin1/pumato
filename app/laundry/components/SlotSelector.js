import { useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { LAUNDRY_NUMBER } from "@/lib/whatsapp";

export default function SlotSelector({ formData, setFormData, availableSlots, loadingSlots, today }) {

    const scrollRef = useRef(null);

    const handleWaitlist = () => {
        const message = `Hi, I'd like a laundry pickup on ${formData.date} but no slots were shown. Please let me know if any slots open up.`;
        const whatsappUrl = `https://wa.me/${LAUNDRY_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
    };

    // Helper to generate next 7 days
    const generateDates = () => {
        const dates = [];
        const baseDate = new Date(); // Start from today

        for (let i = 0; i < 7; i++) {
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() + i);

            // Format: YYYY-MM-DD for value
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const fullDate = `${year}-${month}-${day}`;

            // Display formatting
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }); // Mon
            const dayNum = date.getDate(); // 15
            const isToday = i === 0;

            dates.push({ fullDate, dayName, dayNum, isToday });
        }
        return dates;
    };

    const dates = generateDates();

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-400 ml-1">Select Pickup Date</label>

                {/* Custom Date Scroller */}
                <div className="relative">
                    <div
                        ref={scrollRef}
                        className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {dates.map((dateObj) => (
                            <button
                                key={dateObj.fullDate}
                                type="button"
                                onClick={() => setFormData({ ...formData, date: dateObj.fullDate })}
                                className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border snap-start ${formData.date === dateObj.fullDate
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/50 scale-105'
                                    : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <span className="text-xs font-medium uppercase tracking-wider opacity-80">{dateObj.isToday ? 'Today' : dateObj.dayName}</span>
                                <span className="text-xl font-bold">{dateObj.dayNum}</span>
                            </button>
                        ))}
                    </div>
                    {/* Gradient Fade for scroll indication */}
                    <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-black/50 to-transparent pointer-events-none md:hidden"></div>
                </div>
            </div>

            <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-400 ml-1">
                    Select Pickup Time {formData.date && !loadingSlots ? <span className="text-blue-400 text-xs font-normal ml-2">({availableSlots.length} slots)</span> : ""}
                </label>

                {!formData.date ? (
                    <div className="p-6 rounded-2xl border border-dashed border-white/10 text-gray-500 text-sm text-center bg-white/5">
                        Please select a date above to check availability
                    </div>
                ) : loadingSlots ? (
                    <div className="grid grid-cols-2 gap-3 animate-pulse">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="h-14 bg-white/5 rounded-xl border border-white/5"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {availableSlots.map((slot, idx) => (
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                key={idx}
                                type="button"
                                onClick={() => setFormData({ ...formData, time: slot })}
                                className={`py-4 px-3 rounded-xl text-sm font-bold border transition-all ${formData.time === slot
                                    ? 'bg-white text-black border-white shadow-lg shadow-white/10'
                                    : 'bg-black/20 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {slot}
                            </motion.button>
                        ))}
                        {availableSlots.length === 0 && (
                            <div className="col-span-2 flex flex-col items-center gap-4 py-8 bg-white/5 rounded-2xl border border-white/10 border-dashed">
                                <div className="text-center">
                                    <p className="text-gray-300 font-medium mb-1">No slots available</p>
                                    <p className="text-xs text-gray-500">All pickup slots for this date are fully booked.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleWaitlist}
                                    className="text-sm bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-6 py-2.5 rounded-full transition-colors border border-blue-500/30 font-medium flex items-center gap-2"
                                >
                                    Join Waitlist
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
