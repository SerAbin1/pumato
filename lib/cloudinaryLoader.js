export default function cloudinaryLoader({ src, width, quality }) {
    const q = quality || 80;
    const w = width || 800;

    if (src.startsWith('/')) {
        return src;
    }

    if (src.includes("res.cloudinary.com")) {
        if (src.includes("/upload/")) {
            return src.replace(
                "/upload/",
                `/upload/f_auto,q_${q},w_${w}/`
            );
        }
        return src;
    }

    if (src.includes("images.unsplash.com")) {
        const url = new URL(src);
        url.searchParams.set('w', w);
        url.searchParams.set('q', q);
        url.searchParams.set('auto', 'format');
        return url.toString();
    }

    const hasQuery = src.includes('?');
    const separator = hasQuery ? '&' : '?';
    return `${src}${separator}w=${w}&q=${q}`;
}
