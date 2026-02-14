"use client";

import { AdminAuthProvider } from "@/app/context/AdminAuthContext";
import { Toaster } from "react-hot-toast";

export default function PartnerLayout({ children }) {
    return (
        <AdminAuthProvider>
            <div className="min-h-screen bg-black text-white font-sans selection:bg-orange-500/30">
                {children}
                <Toaster position="bottom-right" toastOptions={{
                    style: {
                        background: '#333',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }} />
            </div>
        </AdminAuthProvider>
    );
}
