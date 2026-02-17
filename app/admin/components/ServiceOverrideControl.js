import { useState } from "react";
import { Lock, Unlock, Zap } from "lucide-react";
import { getISTObject } from "@/lib/dateUtils";

/**
 * Component to manually override service status (force open/close).
 * @param {Object} props
 * @param {Object} props.settings - Ensure it contains manualOverride object
 * @param {Function} props.onUpdate - Callback to update settings
 * @param {string} props.serviceName - Display name of the service
 */
export default function ServiceOverrideControl({ settings, onUpdate, serviceName }) {
    const [updating, setUpdating] = useState(false);

    // Determine current active status from settings
    // If date matches today, show that status. Else show 'auto'.
    const getCurrentStatus = () => {
        if (!settings?.manualOverride) return 'auto';
        const { status, validForDate } = settings.manualOverride;

        const { year, month, day } = getISTObject();
        const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        if (validForDate === today) {
            return status;
        }
        return 'auto';
    };

    const currentStatus = getCurrentStatus();

    const handleOverride = async (status) => {
        setUpdating(true);
        try {
            const { year, month, day } = getISTObject();
            const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const overrideData = {
                status,
                validForDate: today,
                updatedAt: new Date().toISOString()
            };

            // Call parent update handler (which writes to Firestore)
            await onUpdate({
                manualOverride: overrideData
            });
        } catch (error) {
            console.error("Failed to update override:", error);
            alert("Failed to update status");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {serviceName} Status Override
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${currentStatus === 'open' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            currentStatus === 'closed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}>
                            {currentStatus === 'auto' ? 'AUTO (Follows Slots)' : currentStatus.toUpperCase()}
                        </span>
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                        Force open/close for <strong>Today Only.</strong> Resets automatically at midnight IST.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={() => handleOverride('auto')}
                    disabled={updating}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${currentStatus === 'auto'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <Zap size={20} />
                    <span className="font-bold text-sm">Auto (Slots)</span>
                </button>

                <button
                    onClick={() => handleOverride('open')}
                    disabled={updating}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${currentStatus === 'open'
                        ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <Unlock size={20} />
                    <span className="font-bold text-sm">Force Open</span>
                </button>

                <button
                    onClick={() => handleOverride('closed')}
                    disabled={updating}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${currentStatus === 'closed'
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/20'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}
                >
                    <Lock size={20} />
                    <span className="font-bold text-sm">Force Close</span>
                </button>
            </div>
        </div>
    );
}
