// Index math for the marketplace fullscreen image viewer. Kept free of React so the
// wrap-around and clamping rules can be unit tested directly.

export function clampIndex(index, length) {
    if (length <= 0) return 0;
    if (!Number.isFinite(index)) return 0;
    return Math.min(Math.max(Math.trunc(index), 0), length - 1);
}

export function nextIndex(index, length) {
    if (length <= 0) return 0;
    return (clampIndex(index, length) + 1) % length;
}

export function prevIndex(index, length) {
    if (length <= 0) return 0;
    return (clampIndex(index, length) - 1 + length) % length;
}

export function hasMultipleImages(images) {
    return Array.isArray(images) && images.length > 1;
}
