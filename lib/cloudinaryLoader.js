export default function cloudinaryLoader({ src, width, quality }) {
    if (!src.includes("res.cloudinary.com")) return src;

    const q = quality || "auto";

    // If the src already has /upload/, inject params after it
    if (src.includes("/upload/")) {
        return src.replace(
            "/upload/",
            `/upload/f_auto,q_${q},w_${width}/`
        );
    }

    // Fallback for unlikely case where /upload/ isn't present but it's a cloudinary URL
    return src;
}
