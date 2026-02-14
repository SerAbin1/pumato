"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/app/context/AdminAuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import RestaurantForm from "@/app/admin/components/RestaurantForm";
import { LogOut, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function PartnerDashboard() {
    const { user, loading, logout } = useAdminAuth();
    const router = useRouter();
    const [restaurantData, setRestaurantData] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/partner/login");
        } else if (user && user.restaurantId) {
            fetchRestaurant(user.restaurantId);
        } else if (user && !user.restaurantId) {
            // User is logged in but has no restaurant ID (maybe purely admin? or error)
            // Typically admins shouldn't be here, but if they are, they see nothing or need to go to admin panel.
            // For now, let's treat it as no access.
            toast.error("No restaurant assigned to your account.");
            setIsFetching(false);
        }
    }, [user, loading, router]);

    const fetchRestaurant = async (id) => {
        try {
            const docRef = doc(db, "restaurants", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setRestaurantData({ id: docSnap.id, ...docSnap.data() });
            } else {
                toast.error("Restaurant not found.");
            }
        } catch (error) {
            console.error("Error fetching restaurant:", error);
            toast.error("Failed to load restaurant details.");
        } finally {
            setIsFetching(false);
        }
    };

    const handleSave = async (data) => {
        if (!user?.restaurantId) return;
        setIsSaving(true);
        try {
            await setDoc(doc(db, "restaurants", user.restaurantId), data, { merge: true });
            toast.success("Changes saved successfully!");
            // Refresh local data
            setRestaurantData(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error("Error saving restaurant:", error);
            toast.error("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        router.push("/partner/login");
    };

    if (loading || isFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <Loader2 className="animate-spin mr-2" /> Loading...
            </div>
        );
    }

    if (!user) return null; // Redirecting...

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Partner Dashboard</h1>
                        <p className="text-gray-400">Manage your restaurant: <span className="text-orange-400 font-bold">{restaurantData?.name || "Loading..."}</span></p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <LogOut size={18} /> Logout
                    </button>
                </div>

                {restaurantData ? (
                    <RestaurantForm
                        initialData={restaurantData}
                        onSave={handleSave}
                        onCancel={() => {
                            // Reset form or maybe just do nothing since there's nowhere to go back to?
                            // Or maybe reload from server?
                            fetchRestaurant(user.restaurantId);
                            toast.success("Changes discarded.");
                        }}
                        isSaving={isSaving}
                        isPartnerView={true}
                    />
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                        <p className="text-gray-400">No restaurant data found. Please contact support.</p>
                        <p className="text-xs text-gray-600 mt-2">ID: {user.restaurantId}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
