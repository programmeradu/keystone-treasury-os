"use client";

/**
 * Image upload helpers for app icons and screenshots.
 * Converts files to base64 data URLs with canvas resizing
 * to keep localStorage usage manageable.
 */

const ICON_MAX_SIZE = 256;       // px — icon is square
const SCREENSHOT_MAX_WIDTH = 800;
const SCREENSHOT_MAX_HEIGHT = 600;
const MAX_FILE_SIZE_MB = 2;

export interface ImageUploadResult {
    dataUrl: string;
    width: number;
    height: number;
}

/** Validate file before processing */
function validateFile(file: File): string | null {
    if (!file.type.startsWith("image/")) return "File is not an image.";
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `File exceeds ${MAX_FILE_SIZE_MB}MB limit.`;
    return null;
}

/** Read a File into an HTMLImageElement */
function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** Resize an image using canvas and return a base64 data URL */
function resizeToDataUrl(
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number,
    quality = 0.85
): ImageUploadResult {
    let { width, height } = img;

    // Scale down proportionally
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/webp", quality);
    return { dataUrl, width, height };
}

/**
 * Process an icon file — resizes to 256x256 max, returns base64.
 * Returns null + error string on failure.
 */
export async function processIconUpload(
    file: File
): Promise<{ result: ImageUploadResult | null; error: string | null }> {
    const err = validateFile(file);
    if (err) return { result: null, error: err };

    try {
        const img = await loadImage(file);
        const result = resizeToDataUrl(img, ICON_MAX_SIZE, ICON_MAX_SIZE);
        return { result, error: null };
    } catch {
        return { result: null, error: "Failed to process image." };
    }
}

/**
 * Process a screenshot file — resizes to 800x600 max, returns base64.
 * Returns null + error string on failure.
 */
export async function processScreenshotUpload(
    file: File
): Promise<{ result: ImageUploadResult | null; error: string | null }> {
    const err = validateFile(file);
    if (err) return { result: null, error: err };

    try {
        const img = await loadImage(file);
        const result = resizeToDataUrl(img, SCREENSHOT_MAX_WIDTH, SCREENSHOT_MAX_HEIGHT);
        return { result, error: null };
    } catch {
        return { result: null, error: "Failed to process image." };
    }
}

/**
 * Trigger a file input click and return the selected file.
 * Accepts image/* by default.
 */
export function pickFile(accept = "image/*"): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.onchange = () => {
            resolve(input.files?.[0] || null);
        };
        // Handle cancel
        input.addEventListener("cancel", () => resolve(null));
        input.click();
    });
}
