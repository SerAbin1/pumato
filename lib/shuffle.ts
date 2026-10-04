export const seededShuffle = <T>(array: T[], seed: number): T[] => {
    let m = array.length,
        t: T,
        i: number;
    const random = (s: number) => {
        const x = Math.sin(s++) * 10000;
        return x - Math.floor(x);
    };

    const shuffled = [...array];
    let s = seed;
    while (m) {
        i = Math.floor(random(s++) * m--);
        t = shuffled[m];
        shuffled[m] = shuffled[i];
        shuffled[i] = t;
    }
    return shuffled;
};

// Featured restaurants are shuffled among themselves and always lead; the rest
// are shuffled among themselves and follow.
export const shuffleRestaurants = <R extends { isFeatured?: boolean }>(
    restaurants: R[],
    seed: number
): R[] => {
    const featured = restaurants.filter((r) => r.isFeatured === true);
    const others = restaurants.filter((r) => r.isFeatured !== true);
    return [...seededShuffle(featured, seed), ...seededShuffle(others, seed)];
};
