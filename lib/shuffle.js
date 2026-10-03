export const seededShuffle = (array, seed) => {
    let m = array.length,
        t,
        i;
    const random = (s) => {
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
export const shuffleRestaurants = (restaurants, seed) => {
    const featured = restaurants.filter((r) => r.isFeatured === true);
    const others = restaurants.filter((r) => r.isFeatured !== true);
    return [...seededShuffle(featured, seed), ...seededShuffle(others, seed)];
};
