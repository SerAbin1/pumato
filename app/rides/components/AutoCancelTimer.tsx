"use client";

/**
 * Radial countdown ring. `totalSeconds` is the full window (60 for the
 * customer's cancel/confirm window, 7 * 60 for auto-cancel). When `secondsLeft`
 * is null the window has expired / doesn't apply, so nothing is rendered.
 */
export function AutoCancelTimer({
    secondsLeft,
    totalSeconds = 7 * 60,
    className = "",
    size = 80,
}: {
    secondsLeft: number | null;
    totalSeconds?: number;
    className?: string;
    size?: number;
}) {
    if (secondsLeft == null) return null;

    const total = Math.max(1, totalSeconds);
    // Progress fills clockwise as time elapses, starting at 12 o'clock.
    const progress = Math.max(0, Math.min(1, (total - secondsLeft) / total));
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashOffset = circumference * (1 - progress);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const time = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} viewBox="0 0 100 100">
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#374151"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                />
                <circle
                    cx="50"
                    cy="50"
                    r="42"
                    stroke="#8B5CF6"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashOffset}
                    style={{
                        transform: "rotate(-90deg)",
                        transformOrigin: "50% 50%",
                        transition: "stroke-dashoffset 1s linear",
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-mono font-bold text-lg">{time}</span>
            </div>
        </div>
    );
}
