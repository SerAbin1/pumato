"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function CountdownTimer({ readyAt, className = "" }) {
    const [timeDisplay, setTimeDisplay] = useState("");
    const [isOverdue, setIsOverdue] = useState(false);
    const [isWarning, setIsWarning] = useState(false);

    useEffect(() => {
        if (!readyAt) return;

        const calculateTime = () => {
            const readyTime = readyAt.toDate ? readyAt.toDate() : new Date(readyAt);
            const deadline = new Date(readyTime.getTime() + 35 * 60 * 1000); // 35 minutes
            const now = new Date();
            const diff = deadline - now; // Can be negative

            const totalSeconds = Math.floor(diff / 1000);
            const isNegative = totalSeconds < 0;
            const absSeconds = Math.abs(totalSeconds);

            const minutes = Math.floor(absSeconds / 60);
            const seconds = absSeconds % 60;

            setTimeDisplay(
                isNegative
                    ? `-${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
                    : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
            );
            
            setIsOverdue(isNegative);
            setIsWarning(!isNegative && totalSeconds < 5 * 60); // Warning if less than 5 minutes
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [readyAt]);

    if (!readyAt) return null;

    const colorClass = isOverdue ? "text-red-400" : isWarning ? "text-orange-400" : "text-gray-500";

    return (
        <div className={`flex items-center gap-1 ${colorClass} ${className}`}>
            <Clock size={11} className={isOverdue ? "animate-pulse" : ""} />
            <span className={`text-xs font-mono ${isOverdue ? "font-bold" : ""}`}>
                {timeDisplay}
            </span>
            {isOverdue && (
                <span className="text-[10px] text-red-400 font-bold ml-1">OVERDUE</span>
            )}
        </div>
    );
}
