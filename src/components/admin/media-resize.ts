import { MAX_IMAGE_DIMENSION } from "@/lib/media";

/**
 * Client-side downscale + WebP re-encode. No upscale for small images.
 * WebP preserves alpha, so logo transparency survives. Browser-only (canvas).
 */
export async function resizeToWebp(file: File, maxDim = MAX_IMAGE_DIMENSION): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxDim / Math.max(width, height)); // never > 1 (no upscale)
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas indisponibil în acest browser.");
  }
  ctx.drawImage(bitmap, 0, 0, w, h); // transparent canvas by default → alpha preserved
  bitmap.close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Conversia la WebP a eșuat."))),
      "image/webp",
      0.9,
    );
  });
}
