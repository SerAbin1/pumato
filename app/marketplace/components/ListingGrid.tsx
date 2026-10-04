import ListingCard from "./ListingCard";
import type { MarketplaceListing } from "@/lib/types";

export default function ListingGrid({ listings }: { listings: MarketplaceListing[] }) {
    if (!listings || listings.length === 0) {
        return (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                <p className="text-gray-500 text-lg">No listings found matching your filters.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
        </div>
    );
}
