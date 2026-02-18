import { Tag, Save, Clock, Plus, Trash } from "lucide-react";

export default function LaundrySettings({
    laundrySlots,
    selectedDay,
    setSelectedDay,
    slotStart,
    setSlotStart,
    slotEnd,
    setSlotEnd,
    handleAddSlot,
    handleDeleteSlot,
    campusConfig,
    setCampusConfig,
    laundryPricing,
    setLaundryPricing,
    onSaveSettings
}) {

    return (
        <div className="space-y-8">
            <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-4xl mx-auto shadow-2xl">
                <h2 className="text-3xl font-black mb-8 text-white border-b border-white/10 pb-6 flex items-center gap-3">
                    <Clock className="text-cyan-500" /> Laundry Timeslots Management
                </h2>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Day Selector */}
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-2 mb-6">
                            {['default', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border border-white/5 ${selectedDay === day ? 'bg-cyan-500 text-white shadow-lg' : 'bg-black/20 text-gray-500 hover:text-white hover:bg-white/10'}`}
                                >
                                    {day === 'default' ? 'Default' : day.slice(0, 3)}
                                </button>
                            ))}
                        </div>

                        <div className="bg-cyan-500/10 p-6 rounded-2xl border border-cyan-500/20 mb-6">
                            <h4 className="text-xl font-bold text-cyan-400 mb-2">
                                Managing: <span className="text-white underline decoration-cyan-500/50">{selectedDay === 'default' ? 'Default Schedule' : selectedDay}</span>
                            </h4>
                            <p className="text-cyan-200/70 text-sm">
                                {selectedDay === 'default'
                                    ? "These slots apply to any day that doesn't have specific slots set."
                                    : `Slots added here will OVERRIDE the default schedule for all ${selectedDay}s.`}
                            </p>
                        </div>


                        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-2xl">
                            <h4 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><Clock size={16} /> How it works</h4>
                            <p className="text-sm text-blue-200/70 leading-relaxed">
                                Add available pickup time slots for the selected date. These will appear in the Laundry booking form for users.
                            </p>
                        </div>
                    </div>

                    {/* Slot Manager */}
                    <div className="space-y-6">
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Available Slots</label>

                        <div className="flex gap-2 items-end">
                            <div className="flex-1 grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Start</label>
                                    <input
                                        type="time"
                                        value={slotStart}
                                        onChange={(e) => setSlotStart(e.target.value)}
                                        className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50 font-bold [color-scheme:dark]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">End</label>
                                    <input
                                        type="time"
                                        value={slotEnd}
                                        onChange={(e) => setSlotEnd(e.target.value)}
                                        className="w-full p-3 bg-black/20 border border-white/10 rounded-xl text-white outline-none focus:border-cyan-500/50 font-bold [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddSlot}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white p-3.5 rounded-xl transition-colors font-bold shadow-lg shadow-cyan-900/40 h-[50px] w-[50px] flex items-center justify-center"
                                title="Add Slot"
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {laundrySlots.length === 0 && (
                                <div className="text-center py-10 text-gray-500 border border-dashed border-white/10 rounded-2xl">
                                    No slots added for this date.
                                </div>
                            )}
                            {laundrySlots.map((slot, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                                    <span className="font-bold text-gray-200">{slot}</span>
                                    <button
                                        onClick={() => handleDeleteSlot(idx)}
                                        className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
}
