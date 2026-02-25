import { useState, useEffect } from "react";
import { Users, Truck, Store, Plus, Search, Shield, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import FormInput from "./FormInput";
import StickyActionBar from "./StickyActionBar";

export default function UsersTab({ restaurants, user }) {
    const [activeTab, setActiveTab] = useState("partners"); // "partners" | "deliveryBoys"
    const [viewState, setViewState] = useState("list"); // "list" | "form"
    const [partners, setPartners] = useState([]);
    const [deliveryBoys, setDeliveryBoys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        email: "",
        password: "",
        restaurantId: ""
    });

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const idToken = await user.getIdToken();
            const { data, error } = await supabase.functions.invoke("manage-users", {
                body: { action: "LIST_USERS" },
                headers: { "Authorization": `Bearer ${idToken}` }
            });
            if (error) throw error;
            setPartners(data.partners || []);
            setDeliveryBoys(data.deliveryBoys || []);
        } catch (error) {
            console.error(error);
            alert("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = () => {
        setForm({ email: "", password: "", restaurantId: "" });
        setViewState("form");
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        if (!form.email || !form.password || form.password.length < 6) {
            alert("Please provide a valid email and a password of at least 6 characters.");
            setIsSaving(false);
            return;
        }

        const action = activeTab === "partners" ? "CREATE_PARTNER" : "CREATE_DELIVERY_BOY";

        if (activeTab === "partners" && !form.restaurantId) {
            alert("Please select a restaurant for the partner.");
            setIsSaving(false);
            return;
        }

        const payload = {
            action,
            email: form.email,
            password: form.password,
            restaurantId: form.restaurantId || undefined
        };

        try {
            const idToken = await user.getIdToken();
            const { error: fnError, data } = await supabase.functions.invoke("manage-users", {
                body: payload,
                headers: { "Authorization": `Bearer ${idToken}` }
            });

            if (fnError || data.error) {
                throw new Error(data?.message || fnError?.message || "Failed to create user");
            }

            alert(`✅ ${activeTab === 'partners' ? 'Partner' : 'Delivery Boy'} account created successfully!`);
            await fetchUsers();
            setViewState("list");
        } catch (error) {
            console.error(error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500">
            {viewState === "list" ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
                            <button
                                onClick={() => setActiveTab("partners")}
                                className={`flex-1 md:w-48 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'partners' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Store size={18} />
                                Partners ({partners.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("deliveryBoys")}
                                className={`flex-1 md:w-48 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'deliveryBoys' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Truck size={18} />
                                Delivery Boys ({deliveryBoys.length})
                            </button>
                        </div>

                        <button
                            onClick={handleCreateUser}
                            className={`px-8 py-4 rounded-2xl font-bold text-white shadow-lg hover:scale-105 transition-all flex items-center gap-2 ${activeTab === 'partners' ? 'bg-orange-600 shadow-orange-900/40 hover:bg-orange-500' : 'bg-blue-600 shadow-blue-900/40 hover:bg-blue-500'}`}
                        >
                            <Plus size={20} /> Create {activeTab === 'partners' ? 'Partner' : 'Delivery Boy'}
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(activeTab === 'partners' ? partners : deliveryBoys).map(u => (
                                <div key={u.uid} className="bg-white/5 p-6 rounded-[2rem] border border-white/10 relative group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${activeTab === 'partners' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                            {activeTab === 'partners' ? 'PARTNER' : 'DELIVERY BOY'}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{u.email}</h3>

                                    {activeTab === 'partners' && (
                                        <div className="mt-4 p-3 bg-black/30 rounded-xl border border-white/5 flex items-center gap-2 text-sm text-gray-300">
                                            <Store size={16} className="text-gray-500" />
                                            <span className="font-bold">{restaurants.find(r => r.id === u.restaurantId)?.name || u.restaurantId}</span>
                                        </div>
                                    )}

                                    <div className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-500">
                                        <Shield size={14} /> ID: <span className="text-gray-400 tracking-wider bg-black/50 px-2 py-1 rounded-md font-mono">{u.uid.slice(0, 12)}...</span>
                                    </div>
                                    {u.lastSignInTime && (
                                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
                                            <Clock size={14} /> Last Login: {new Date(u.lastSignInTime).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {(activeTab === 'partners' ? partners : deliveryBoys).length === 0 && (
                                <div className="col-span-full text-center py-20 bg-white/5 border border-white/5 rounded-3xl border-dashed">
                                    <Users className="mx-auto text-gray-600 mb-4" size={48} />
                                    <p className="text-gray-400 font-medium text-lg">No {activeTab === 'partners' ? 'Partners' : 'Delivery Boys'} found.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white/5 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] border border-white/10 max-w-2xl mx-auto shadow-2xl relative pb-24">
                    <h2 className="text-3xl font-black mb-10 text-white border-b border-white/10 pb-6">
                        Create New {activeTab === 'partners' ? 'Partner' : 'Delivery Boy'}
                    </h2>

                    <div className="space-y-8">
                        <FormInput
                            label="Email Address"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="partner@example.com"
                        />

                        <FormInput
                            label="Password"
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Min 6 characters"
                        />

                        {activeTab === 'partners' && (
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Assign Restaurant</label>
                                <select
                                    className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium"
                                    value={form.restaurantId}
                                    onChange={(e) => setForm({ ...form, restaurantId: e.target.value })}
                                >
                                    <option value="" disabled className="bg-gray-900">Select a restaurant...</option>
                                    {restaurants.map(r => (
                                        <option key={r.id} value={r.id} className="bg-gray-900">{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <StickyActionBar
                        onSave={handleSubmit}
                        onCancel={() => setViewState("list")}
                        isSaving={isSaving}
                        title={`Creating ${activeTab === 'partners' ? 'Partner' : 'Delivery Boy'}`}
                        saveLabel="Create Account"
                    />
                </div>
            )}
        </div>
    );
}
