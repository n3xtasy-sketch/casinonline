"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Upload, Copy, Trash2, Check } from "lucide-react";
import {
  MEDIA_FOLDERS,
  ACCEPT_ATTR,
  ACCEPTED_INPUT_MIME,
  type MediaFolder,
} from "@/lib/media";
import type { MediaFile } from "@/lib/db/admin-media";
import type { MediaUsage } from "@/lib/db/admin-media";
import { resizeToWebp } from "@/components/admin/media-resize";
import {
  uploadMedia,
  listMediaAction,
  deleteMedia,
} from "@/app/admin/(panel)/media/actions";

interface Props {
  /** When provided, each file shows a "Folosește" button that returns its URL. */
  onPick?: (url: string) => void;
  initialFolder?: MediaFolder;
}

export function MediaManager({ onPick, initialFolder = "casinos" }: Props) {
  const [folder, setFolder] = useState<MediaFolder>(initialFolder);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, startLoad] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ path: string; usage: MediaUsage[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = (f: MediaFolder) => startLoad(async () => setFiles(await listMediaAction(f)));

  useEffect(() => {
    reload(folder);
  }, [folder]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!ACCEPTED_INPUT_MIME.includes(file.type)) {
      setError("Tip neacceptat. Folosește PNG, JPEG, WebP sau AVIF (fără SVG).");
      return;
    }
    setBusy(true);
    try {
      const webp = await resizeToWebp(file);
      const fd = new FormData();
      fd.append("file", new File([webp], file.name, { type: "image/webp" }));
      fd.append("folder", folder);
      fd.append("name", file.name);
      const res = await uploadMedia(fd);
      if ("error" in res) setError(res.error);
      else reload(folder);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload eșuat.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1500);
    } catch {
      setError("Clipboard indisponibil.");
    }
  }

  async function onDelete(path: string, force = false) {
    setBusy(true);
    setError(null);
    try {
      const res = await deleteMedia(path, force);
      if ("ok" in res) {
        setConfirmDel(null);
        reload(folder);
      } else if ("blocked" in res) {
        setConfirmDel({ path, usage: res.usage });
      } else {
        setError(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {MEDIA_FOLDERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFolder(f)}
            className={
              folder === f
                ? "rounded-sm bg-accent/12 px-3 py-1.5 text-sm font-medium text-ink"
                : "rounded-sm px-3 py-1.5 text-sm font-medium text-ink-secondary hover:bg-elevated hover:text-ink"
            }
          >
            {f}
          </button>
        ))}
        <div className="ml-auto">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={onFile}
            className="hidden"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent px-3 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50"
          >
            <Upload size={15} />
            {busy ? "Se încarcă…" : "Încarcă imagine"}
          </button>
        </div>
      </div>

      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}

      {confirmDel ? (
        <div className="rounded-md border border-danger/40 bg-danger/5 p-4 text-sm">
          <p className="font-medium text-ink">Fișierul e folosit de {confirmDel.usage.length} entități:</p>
          <ul className="mt-2 flex flex-col gap-1">
            {confirmDel.usage.map((u) => (
              <li key={u.href}>
                <a href={u.href} className="text-accent hover:text-link-hover">{u.label}</a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(confirmDel.path, true)}
              className="h-9 rounded-sm bg-danger px-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Șterge oricum
            </button>
            <button
              type="button"
              onClick={() => setConfirmDel(null)}
              className="h-9 px-3 text-sm text-ink-secondary hover:text-ink"
            >
              Anulează
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-ink-muted">Se încarcă…</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-ink-muted">Niciun fișier în folderul {folder}.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => (
            <div key={f.path} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-2">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.name} className="max-h-full max-w-full object-contain" loading="lazy" />
              </div>
              <p className="truncate text-xs text-ink-muted" title={f.name}>{f.name}</p>
              <div className="flex items-center gap-2">
                {onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(f.url)}
                    className="rounded-sm bg-accent/12 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/20"
                  >
                    Folosește
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => copy(f.url)}
                  title="Copiază URL"
                  className="inline-flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs text-ink-secondary hover:bg-elevated hover:text-ink"
                >
                  {copied === f.url ? <Check size={13} /> : <Copy size={13} />}
                  {copied === f.url ? "Copiat" : "URL"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(f.path)}
                  title="Șterge"
                  className="ml-auto inline-flex items-center rounded-sm p-1 text-ink-muted hover:bg-elevated hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
