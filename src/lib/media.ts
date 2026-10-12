/** Shared Media Library constants (client + server safe — no server-only deps). */

export const MEDIA_BUCKET = "media";

export const MEDIA_FOLDERS = [
  "casinos",
  "games",
  "providers",
  "guides",
  "payments",
  "general",
] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

export function isMediaFolder(v: unknown): v is MediaFolder {
  return typeof v === "string" && (MEDIA_FOLDERS as readonly string[]).includes(v);
}

/** Accepted INPUT types (everything is re-encoded to WebP client-side before upload). */
export const ACCEPTED_INPUT_MIME = ["image/png", "image/jpeg", "image/webp", "image/avif"];
export const ACCEPT_ATTR = ACCEPTED_INPUT_MIME.join(",");

/** Max longest-edge after client-side downscale (no upscale for smaller images). */
export const MAX_IMAGE_DIMENSION = 1600;

/** Max bytes for the uploaded (already WebP-compressed) blob. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
