export default function Skeleton({ className, ...props }) {
    return (
        <div
            className={`animate-pulse bg-white/5 rounded-2xl ${className}`}
            {...props}
        />
    );
}

export function RestaurantSkeleton() {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col gap-6 animate-pulse">
            <div className="h-56 bg-white/5 rounded-2xl" />
            <div className="space-y-3">
                <div className="h-8 bg-white/5 rounded-xl w-3/4" />
                <div className="h-4 bg-white/5 rounded-lg w-1/2" />
            </div>
            <div className="h-12 bg-white/5 rounded-xl w-full mt-4" />
        </div>
    );
}

export function MenuSkeleton() {
    return (
        <div className="bg-white/5 p-4 md:p-6 rounded-[2rem] border border-white/5 flex gap-4 md:gap-8 animate-pulse">
            <div className="flex-1 space-y-4">
                <div className="h-6 bg-white/5 rounded-lg w-1/4" />
                <div className="h-8 bg-white/5 rounded-xl w-3/4" />
                <div className="h-6 bg-white/5 rounded-lg w-1/2" />
                <div className="space-y-2">
                    <div className="h-3 bg-white/5 rounded w-full" />
                    <div className="h-3 bg-white/5 rounded w-5/6" />
                </div>
            </div>
            <div className="w-32 h-32 md:w-40 md:h-40 bg-white/5 rounded-2xl flex-shrink-0" />
        </div>
    );
}
