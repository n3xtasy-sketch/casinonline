"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { MediaManager } from "@/components/admin/MediaManager";
import type { MediaFolder } from "@/lib/media";

interface Props {
  label: string;
  name: string;
  defaultValue?: string;
  folder?: MediaFolder;
  /** Mirror the current value to a parent (e.g. for live previews). Optional. */
  onChange?: (url: string) => void;
}

/**
 * Reusable image field: a URL input + a "Alege / Încarcă" button that opens the
 * Media Library in a modal. Picking an image writes its public URL into the input.
 * Drop-in for Casino/Game/Provider/Guide/Payment forms (wired up later).
 */
export function MediaField({ label, name, defaultValue = "", folder = "general", onChange }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const apply = (v: string) => {
    setValue(v);
    onChange?.(v);
  };

  const input =
    "h-10 flex-1 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <input
          name={name}
          type="url"
          value={value}
          onChange={(e) => apply(e.target.value)}
          placeholder="https://… sau alege din librărie"
          className={input}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated"
        >
          <ImageIcon size={15} />
          Alege / Încarcă
        </button>
      </div>

      {value ? (
        <div className="mt-1 h-16 w-16 overflow-hidden rounded-sm border border-border bg-elevated">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-contain" />
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Librărie media"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-4xl rounded-md border border-border bg-base p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Librărie media</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-sm p-1 text-ink-muted hover:bg-elevated hover:text-ink"
                aria-label="Închide"
              >
                <X size={18} />
              </button>
            </div>
            <MediaManager
              initialFolder={folder}
              onPick={(url) => {
                apply(url);
                setOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
