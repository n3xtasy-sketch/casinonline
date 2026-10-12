import { MediaManager } from "@/components/admin/MediaManager";

export default function AdminMediaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Media Library</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Încarcă, previzualizează, copiază URL și șterge imagini. Upload-ul redimensionează
          automat la WebP (max 1600px, cu transparență păstrată).
        </p>
      </div>
      <MediaManager />
    </div>
  );
}
