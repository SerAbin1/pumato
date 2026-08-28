"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import TermsFooter from "../components/TermsFooter";
import ListingGrid from "./components/ListingGrid";
import ListingDetail from "./components/ListingDetail";
import { RestaurantSkeleton } from "../components/Skeleton";
import useFirestore from "@/app/hooks/useFirestore";
import { COLLECTIONS, SITE_CONTENT_DOCS } from "@/lib/constants";
import { Search, Plus } from "lucide-react";
import CustomSelect from "../components/CustomSelect";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTrackSearch } from "../hooks/useTrackSearch";

function isListingLive(listing) {
    if (listing.isVisible === false) return false;
    if (!listing.expiryDate) return true;
    const todayStr = new Date().toISOString().slice(0, 10);
    return listing.expiryDate >= todayStr;
}

function MarketplaceContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get("id");

    const { getCollection, loading } = useFirestore();
    const [listings, setListings] = useState([]);
    const [filters, setFilters] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const fetchListings = async () => {
            try {
                const data = await getCollection(COLLECTIONS.MARKETPLACE_LISTINGS);
                setListings(data.filter(isListingLive));
            } catch (err) {
                console.error("Error fetching marketplace listings:", err);
            }
        };
        const fetchFilters = async () => {
            try {
                const snap = await getDoc(
                    doc(db, COLLECTIONS.SITE_CONTENT, SITE_CONTENT_DOCS.MARKETPLACE_FILTERS)
                );
                if (snap.exists()) {
                    setFilters(snap.data().filters || []);
                }
            } catch (err) {
                console.error("Error fetching marketplace filters:", err);
            }
        };
        fetchListings();
        fetchFilters();
    }, [getCollection]);

    const filteredListings = useMemo(() => {
        let items = listings;
        if (filter !== "all") {
            items = items.filter((l) => l.filter === filter);
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            items = items.filter((l) => l.itemName?.toLowerCase().includes(query));
        }
        return [...items].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }, [listings, filter, searchQuery]);

    useTrackSearch(searchQuery, filteredListings.length, "marketplace");

    if (id) {
        const listing = listings.find((l) => l.id === id);
        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
            );
        }
        if (!listing) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-white">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Listing not found</h2>
                        <Link href="/marketplace" className="text-purple-500 hover:underline">
                            Go back to Marketplace
                        </Link>
                    </div>
                </div>
            );
        }
        return <ListingDetail listing={listing} />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 pt-24 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                        Pumato Marketplace
                    </h1>
                    <p className="text-gray-400">
                        Where campus commerce, opportunities & community come together
                    </p>
                </div>
                <Link
                    href="/marketplace/sell"
                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/30 whitespace-nowrap"
                >
                    <Plus size={18} /> Post on Marketplace
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-purple-500 transition-colors"
                        size={18}
                    />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all font-medium placeholder-gray-500"
                    />
                </div>
                <CustomSelect
                    options={[
                        { label: "All Filters", value: "all" },
                        ...filters.map((f) => ({ label: f.label, value: f.label })),
                    ]}
                    value={filter}
                    onChange={setFilter}
                    placeholder="Filter"
                    className="min-w-[180px]"
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[...Array(6)].map((_, i) => (
                        <RestaurantSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <ListingGrid listings={filteredListings} />
            )}
        </div>
    );
}

export default function MarketplacePage() {
    return (
        <main className="min-h-screen bg-black text-white relative overflow-x-hidden">
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
            <Navbar />
            <Suspense
                fallback={
                    <div className="min-h-screen flex items-center justify-center bg-black">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                    </div>
                }
            >
                <MarketplaceContent />
            </Suspense>
            <TermsFooter type="marketplace" />
        </main>
    );
}
