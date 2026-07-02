import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const MAX_DIMENSION = 1600;
const IMAGE_QUALITY = 0.8;

// Resizes to MAX_DIMENSION and re-encodes as webp on the client before upload.
// Falls back to the original file if the browser can't decode/encode it (e.g. SVG, unsupported format).
export async function optimizeImage(file) {
    if (!file.type?.startsWith("image/") || file.type === "image/svg+xml") {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();

        const blob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/webp", IMAGE_QUALITY)
        );
        if (!blob) return file;

        const optimizedName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
        return new File([blob], optimizedName, { type: "image/webp" });
    } catch (err) {
        console.error("Image optimization failed, uploading original file", err);
        return file;
    }
}

export async function uploadImage(file, folder) {
    const optimized = await optimizeImage(file);
    const storageRef = ref(storage, `${folder}/${Date.now()}-${optimized.name}`);
    await uploadBytes(storageRef, optimized);
    return getDownloadURL(storageRef);
}

// Returns a handler compatible with `<input type="file" onChange={handler}>` usage
// where a single uploaded file's URL is reported back via setUrlCallback(url).
export function createFileUploadHandler(folder) {
    return async function handleFileUpload(e, setUrlCallback) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const url = await uploadImage(file, folder);
            setUrlCallback(url);
        } catch (err) {
            console.error("Upload error", err);
            alert("Upload failed");
        }
    };
}
