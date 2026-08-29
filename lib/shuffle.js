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
