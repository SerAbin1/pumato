import type { ReactNode } from "react";
import { Bike } from "lucide-react";
import Navbar from "@/app/components/Navbar";

/**
 * Grid placement for the shell's children. On large screens the heading and
 * `sideColumn` items stack on the left while `mainColumn` fills the right; on
 * phones everything stacks in DOM order under the heading.
 */
export const mainColumn = "min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2";
export const sideColumn = "min-w-0 lg:col-start-1";

export default function RidesShell({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-clip">
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.03] z-[0] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            ></div>
            <Navbar />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-600/15 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 pt-28 pb-16 relative z-10">
                <div className="grid gap-6 items-start lg:grid-cols-2 lg:gap-x-12">
                    <header className={`${sideColumn} flex items-center gap-4`}>
                        <div className="w-14 h-14 shrink-0 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                            <Bike size={28} className="text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                                {title}
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
                        </div>
                    </header>
                    {children}
                </div>
            </div>
        </main>
    );
}

/** A short numbered explainer for the side column. */
export function Steps({
    title,
    steps,
    footer,
}: {
    title: string;
    steps: string[];
    footer?: ReactNode;
}) {
    return (
        <section className={`${sideColumn} space-y-4`}>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h2>
            <ol className="space-y-3">
                {steps.map((step, i) => (
                    <li key={step} className="flex gap-3 text-sm text-gray-300">
                        <span className="w-6 h-6 shrink-0 rounded-full bg-white/10 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                    </li>
                ))}
            </ol>
            {footer}
        </section>
    );
}
