"use client";

import { AdminAuthProvider } from "@/app/context/AdminAuthContext";

export default function AdminLayout({ children }) {
    return (
        <AdminAuthProvider>
            {children}
        </AdminAuthProvider>
    );
}
