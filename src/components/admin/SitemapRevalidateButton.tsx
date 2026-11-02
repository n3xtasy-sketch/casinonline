"use client";

import { useState, useTransition } from "react";
import { revalidateSitemapAction } from "@/app/admin/(panel)/seo/sitemap-actions";

export function SitemapRevalidateButton() {
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = () => {
    setMsg(null);
    start(async () => {
      const r = await revalidateSitemapAction();
      setMsg("error" in r ? { tone: "err", text: r.error } : { tone: "ok", text: "Sitemap revalidat. Reîncarcă /sitemap.xml peste câteva secunde." });
    });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-ink">Revalidează sitemap.xml</div>
          <p className="mt-0.5 max-w-[70ch] text-xs text-ink-muted">
            Folosește după modificări făcute direct în baza de date (SQL), care ocolesc invalidarea automată din CMS.
            Editările normale din Admin reîmprospătează sitemap-ul singure.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="h-9 shrink-0 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Se revalidează…" : "Revalidează acum"}
        </button>
      </div>
      {msg ? <p role="status" className={`text-sm font-medium ${msg.tone === "ok" ? "text-accent" : "text-danger"}`}>{msg.text}</p> : null}
    </div>
  );
}
